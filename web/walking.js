// Générateur de lignes de basse sur une grille d'accords, en plusieurs styles rythmiques.
// La walking part d'un squelette en noires : chaque changement d'accord est un « point d'appui »
// (fondamentale ou note de l'accord), les temps intermédiaires marchent dans la gamme ou l'arpège,
// le dernier temps approche le point suivant. On y ajoute ensuite croches swing et triolets.

import { parseChord, bassRoot, notesInRange, LOW_E, HIGH } from './theory.js';

export const STYLES = {
  walking: 'Walking (swing)',
  two: 'Two-feel (blanches)',
  bossa: 'Bossa',
  eighths: 'Croches (pop/rock)',
};

// Hasard reproductible : même graine = même ligne.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SWING = 2 / 3;   // position de la croche swing dans le temps

const nearest = (list, x) => list.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
const clamp = (m) => (m < LOW_E ? m + 12 : m > HIGH ? m - 12 : m);

// Note suivante de la liste dans une direction ; repart dans l'autre sens au bord de la tessiture.
function stepIn(list, from, dir, turned = false) {
  const next = dir > 0 ? list.find((m) => m > from) : [...list].reverse().find((m) => m < from);
  if (next != null) return next;
  return turned ? from : stepIn(list, from, -dir, true);
}

// Approche chromatique d'une note, par le côté d'où l'on vient.
function chromaticTo(target, from) {
  const a = target + (from > target ? 1 : -1);
  return a < LOW_E || a > HIGH ? target - (a - target) : a;
}

// Segments : un accord et sa durée en temps.
function segments(bars, bpb) {
  const segs = [];
  bars.forEach((bar, b) => {
    const len = bpb / bar.chords.length;
    bar.chords.forEach((sym, i) => segs.push({ t: b * bpb + i * len, len, chord: parseChord(sym) }));
  });
  return segs;
}

// Squelette en noires (walking classique).
function walkQuarters(segs, rand, bpb) {
  // Points d'appui : fondamentale si l'accord change, sinon une note de l'accord proche.
  let prev = null;
  const anchors = segs.map((seg, i) => {
    const sameChord = i > 0 && segs[i - 1].chord.symbol === seg.chord.symbol;
    let note;
    if (prev == null) {
      note = bassRoot(seg.chord);
      if (note < 31) note += 12;   // on démarre dans le médium
    } else if (sameChord && rand() < 0.6) {
      const tones = notesInRange(seg.chord, seg.chord.tones).filter((m) => Math.abs(m - prev) <= 7 && m !== prev);
      note = tones.length ? tones[Math.floor(rand() * tones.length)] : prev;
    } else {
      const roots = notesInRange(seg.chord, [0]);
      note = nearest(roots, prev > 41 ? prev - 5 : prev);
    }
    prev = note;
    return note;
  });

  const events = [];
  const push = (t, midi, accent) =>
    events.push({ t, dur: 0.9, midi, vel: (accent ? 0.85 : 0.72) + rand() * 0.08 });

  segs.forEach((seg, i) => {
    const a = anchors[i];
    const target = anchors[(i + 1) % anchors.length];
    push(seg.t, a, seg.t % bpb === 0);

    // Temps de remplissage (tous sauf le premier et le dernier du segment).
    let cur = a;
    const fill = seg.len - 2;
    let dir = target > a ? 1 : target < a ? -1 : rand() < 0.5 ? 1 : -1;
    if (a >= 43) dir = -1;
    if (a <= LOW_E + 2) dir = 1;
    for (let k = 1; k <= fill; k++) {
      const pool = rand() < 0.5
        ? notesInRange(seg.chord, seg.chord.scale)
        : notesInRange(seg.chord, seg.chord.tones);
      cur = stepIn(pool, cur, dir);
      push(seg.t + k, cur, false);
    }

    // Dernier temps : approche du point suivant (chromatique, diatonique ou par la quinte).
    if (seg.len >= 2) {
      const from = cur > target ? 1 : cur < target ? -1 : (rand() < 0.5 ? 1 : -1);
      let approach;
      const r = rand();
      if (r < 0.55) {
        approach = target + from;
      } else if (r < 0.85) {
        const scale = notesInRange(seg.chord, seg.chord.scale, LOW_E - 2, HIGH + 2);
        approach = stepIn(scale, target, from);
      } else {
        approach = target + (from > 0 ? 7 : -5);
      }
      if (approach === cur || approach === target) approach = target - from;
      if (approach < LOW_E) approach = target + 1;
      if (approach > HIGH) approach = target - 1;
      push(seg.t + seg.len - 1, approach, false);
    }
  });
  return events;
}

// Walking enrichie : croches swing (note fantôme ou approche) et triolets, jamais sur le temps 1.
function embellish(quarters, rand, bpb) {
  const out = [];
  quarters.forEach((e, i) => {
    const next = quarters[i + 1];
    const r = rand();
    if (!next || next.t !== e.t + 1 || e.t % bpb === 0 || r >= 0.3) {
      out.push(e);
      return;
    }
    const approach = chromaticTo(next.midi, e.midi);
    if (r < 0.1) {
      // Note fantôme : même note, très douce, sur la croche swing.
      out.push({ ...e, dur: 0.55 }, { t: e.t + SWING, dur: 0.3, midi: e.midi, vel: e.vel * 0.55 });
    } else if (r < 0.22) {
      // Croche swing qui approche chromatiquement la note suivante.
      out.push({ ...e, dur: 0.55 }, { t: e.t + SWING, dur: 0.3, midi: approach, vel: e.vel * 0.85 });
    } else {
      // Triolet : la note, une note de passage, puis l'approche.
      const mid = Math.round((e.midi + approach) / 2);
      out.push(
        { ...e, dur: 0.3 },
        { t: e.t + 1 / 3, dur: 0.3, midi: mid === e.midi || mid === approach ? e.midi : mid, vel: e.vel * 0.8 },
        { t: e.t + 2 / 3, dur: 0.3, midi: approach, vel: e.vel * 0.85 },
      );
    }
  });
  return out;
}

// Two-feel : blanches sur les temps 1 et 3, avec parfois une croche swing qui relance.
function twoFeel(quarters, rand, bpb) {
  const out = [];
  quarters.forEach((e, i) => {
    const beat = e.t % bpb;
    if (beat === 0 || beat === 2) {
      out.push({ ...e, dur: 1.85 });
    } else if (beat === 1 || beat === 3) {
      const next = quarters[i + 1];
      if (next && rand() < 0.3) {
        out.push({ t: e.t + SWING, dur: 0.3, midi: chromaticTo(next.midi, e.midi), vel: 0.7 });
      }
    }
  });
  return out;
}

// Bossa : noire pointée + croche, fondamentale et quinte (| R . . 5 | 5 . . R |).
function bossa(segs, rand) {
  const out = [];
  const note = (t, dur, midi, vel = 0.8) => out.push({ t, dur, midi, vel });
  segs.forEach((seg, i) => {
    const r = bassRoot(seg.chord);
    const fifth = r + 7 <= 45 ? r + 7 : r - 5;
    const nextRoot = bassRoot((segs[i + 1] ?? segs[0]).chord);
    const last = rand() < 0.35 ? chromaticTo(nextRoot, r) : r;
    if (seg.len >= 4) {
      note(seg.t, 1.4, r, 0.85);
      note(seg.t + 1.5, 0.45, fifth, 0.7);
      note(seg.t + 2, 1.4, fifth, 0.8);
      note(seg.t + 3.5, 0.45, last, 0.7);
    } else {
      note(seg.t, 1.4, r, 0.85);
      note(seg.t + 1.5, 0.45, rand() < 0.5 ? fifth : last, 0.7);
    }
  });
  return out;
}

// Croches droites : fondamentale, octave et quinte de temps en temps, approche en fin d'accord.
function eighths(segs, rand) {
  const out = [];
  segs.forEach((seg, i) => {
    const r = bassRoot(seg.chord);
    const nextRoot = bassRoot((segs[i + 1] ?? segs[0]).chord);
    const n = seg.len * 2;
    for (let k = 0; k < n; k++) {
      let midi = r;
      if (k === n - 1 && rand() < 0.5) midi = chromaticTo(nextRoot, r);
      else if (k % 4 === 3 && rand() < 0.35) midi = clamp(r + 12);
      else if (k === 4 && rand() < 0.3) midi = clamp(r + 7);
      out.push({ t: seg.t + k / 2, dur: 0.42, midi, vel: k % 2 === 0 ? 0.85 : 0.65 });
    }
  });
  return out;
}

// bars : [{ chords: ['Dm7'] }, { chords: ['Gm7', 'C7'] }, ...]
// Renvoie des événements { t, dur, midi, vel } (t et dur en temps), triés.
export function bassLine(bars, seed = 1, style = 'walking', bpb = 4) {
  const rand = rng(seed);
  const segs = segments(bars, bpb);
  let events;
  if (style === 'two') events = twoFeel(walkQuarters(segs, rand, bpb), rand, bpb);
  else if (style === 'bossa') events = bossa(segs, rand);
  else if (style === 'eighths') events = eighths(segs, rand);
  else events = embellish(walkQuarters(segs, rand, bpb), rand, bpb);

  // Fin du morceau : la fondamentale tenue sur la dernière mesure.
  if (!bars.length) return events;
  const lastBar = (bars.length - 1) * bpb;
  const out = events.filter((e) => e.t < lastBar);
  out.push({ t: lastBar, dur: bpb - 0.4, midi: bassRoot(parseChord(bars[bars.length - 1].chords[0])), vel: 0.85 });
  return out.sort((a, b) => a.t - b.t);
}
