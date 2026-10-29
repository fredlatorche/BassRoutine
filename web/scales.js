// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Exercices de gammes : toutes les tonalités, 1 ou 2 octaves ou tout le manche,
// en montant, en descendant ou aller-retour, avec trois doigtés au choix :
// 3 notes par corde, en position (moins de déplacements), ou par boxes.
// Les notes sont orthographiées correctement (Si♭ en Fa majeur, Fa♯ en Sol majeur…).

import { LOW_E } from './theory.js';
import { keyFifths } from './spelling.js';

const LETTERS = 'CDEFGAB';
const FR = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const NECK_TOP = 55;   // Sol, case 12 de la corde de G
const OPEN = [28, 33, 38, 43];   // cordes à vide E, A, D, G (de la plus grave à la plus aiguë)
const MAX_FRET = 20;

// steps : intervalles depuis la tonique ; degrees : degré (0 à 6) de chaque note, pour le nom ;
// rootFinger : doigt de la tonique grave dans le doigté de référence.
export const SCALE_TYPES = {
  major: { label: 'Majeure', steps: [0, 2, 4, 5, 7, 9, 11], degrees: [0, 1, 2, 3, 4, 5, 6], minor: false, chord: 'maj7', rootFinger: 2 },
  minor: { label: 'Mineure naturelle', steps: [0, 2, 3, 5, 7, 8, 10], degrees: [0, 1, 2, 3, 4, 5, 6], minor: true, chord: 'm7', rootFinger: 1 },
  harmonic: { label: 'Mineure harmonique', steps: [0, 2, 3, 5, 7, 8, 11], degrees: [0, 1, 2, 3, 4, 5, 6], minor: true, chord: 'm', rootFinger: 1 },
  pentaMajor: { label: 'Pentatonique majeure', steps: [0, 2, 4, 7, 9], degrees: [0, 1, 2, 4, 5], minor: false, chord: '6', rootFinger: 2 },
  pentaMinor: { label: 'Pentatonique mineure', steps: [0, 3, 5, 7, 10], degrees: [0, 2, 3, 4, 6], minor: true, chord: 'm7', rootFinger: 1 },
};

// Orthographe usuelle des tonalités, par hauteur (0 = Do).
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const accidental = (n) => (n > 0 ? '♯'.repeat(n) : '♭'.repeat(-n));

function spell(letterIdx, pc) {
  const acc = ((pc - NATURAL[letterIdx] + 18) % 12) - 6;
  return FR[letterIdx] + accidental(acc);
}

export function keyName(pc, minor) {
  const k = (minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
  return spell(LETTERS.indexOf(k[0]), pc);
}

// Liste des tonalités pour le menu : [{ value, label }], plus « toutes ».
export function keyOptions(type) {
  const minor = SCALE_TYPES[type].minor;
  return [
    ...Array.from({ length: 12 }, (_, pc) => ({ value: String(pc), label: keyName(pc, minor) })),
    { value: 'all', label: 'Toutes (cycle des quartes)' },
  ];
}

export const FINGERINGS = {
  '3nps': '3 notes par corde',
  position: 'En position',
  boxes: 'Boxes (positions)',
};

export const ZONES = {
  auto: 'Auto',
  low: 'Grave (cases 0–5)',
  mid: 'Médium (cases 5–12)',
  high: 'Aiguë (cases 12+)',
};

// Une box par degré de la gamme (5 en pentatonique, 7 sinon), plus « toutes ».
export function boxOptions(type) {
  const n = SCALE_TYPES[type].steps.length;
  return [
    ...Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: `Box ${i + 1}` })),
    { value: 'all', label: 'Toutes (tout le manche)' },
  ];
}

// Note -> { midi, name, root } si elle appartient à la gamme, sinon null.
function speller(type, pc) {
  const s = SCALE_TYPES[type];
  const k = (s.minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
  const keyLetter = LETTERS.indexOf(k[0]);
  return (m) => {
    const i = s.steps.indexOf((m - pc + 120) % 12);
    return i < 0 ? null : { midi: m, name: spell((keyLetter + s.degrees[i]) % 7, m % 12), root: i === 0 };
  };
}

function notesBetween(type, pc, lo, hi) {
  const sp = speller(type, pc);
  const out = [];
  for (let m = lo; m <= hi; m++) {
    const n = sp(m);
    if (n) out.push(n);
  }
  return out;
}

const lowestRoot = (pc) => LOW_E + ((pc - 4 + 12) % 12);   // tonique la plus grave de la basse

// ---------- Doigté « en position » ----------
// La main couvre 4 cases (un doigt par case, index sur la case p), avec extension possible
// de l'index d'une case vers le bas. On cherche la suite de positions qui demande le moins
// de déplacements de main (programmation dynamique) : les notes passent d'une corde à l'autre
// au lieu de remonter le long d'une seule corde.
// Doigtés de référence retrouvés ainsi : majeure 2-4 | 1-2-4 | 1-3-4, penta mineure 1-4 | 1-3 | 1-3.

const MAX_POS = 17;
const ZONE_POS = { auto: [1, MAX_POS], low: [1, 5], mid: [5, 12], high: [12, MAX_POS] };

function candidates(midi, zone) {
  const [pMin, pMax] = ZONE_POS[zone];
  const out = [];
  OPEN.forEach((open, string) => {
    const fret = midi - open;
    if (fret < 0 || fret > MAX_FRET) return;
    for (let p = 1; p <= MAX_POS; p++) {
      let finger, cost;
      if (fret === 0) {
        // Corde à vide : privilégiée en bas du manche (main en position 1 à 5), évitée plus haut.
        const lowZone = zone === 'auto' || zone === 'low';
        [finger, cost] = [0, lowZone ? (p <= 5 ? -0.4 : 1) : 3];
      } else {
        const k = fret - p;                              // -1 (extension de l'index) à 3 (auriculaire)
        if (k < -1 || k > 3) continue;
        finger = k <= 0 ? 1 : k + 1;
        cost = k === -1 ? 0.6 : 0;
      }
      const outside = p < pMin ? pMin - p : p > pMax ? p - pMax : 0;   // hors de la zone demandée
      out.push({ string, fret, p, finger, cost: cost + outside + p * 0.01 });   // à égalité, le bas du manche
    }
  });
  return out;
}

function transition(a, b, interval) {
  let cost = 0;
  if (a.p !== b.p) {
    // Déplacement de main : plusieurs petits (sur un ton) valent mieux qu'un grand saut ; jamais sur un demi-ton.
    cost += 1.5 + 0.6 * Math.abs(b.p - a.p) + (Math.abs(interval) === 1 ? 3 : 0);
  }
  const jump = Math.abs(b.string - a.string);
  if (jump > 1) cost += 0.5 * (jump - 1);                 // sauter une corde
  if ((interval > 0 && b.string < a.string) || (interval < 0 && b.string > a.string)) cost += 6;   // contre le sens de la gamme
  return cost;
}

// layers : candidats par note. Renvoie { path, cost } de moindre coût.
function bestPath(midis, layers) {
  let best = layers[0].map((c) => ({ cost: c.cost, path: [c] }));
  for (let i = 1; i < layers.length; i++) {
    const interval = midis[i] - midis[i - 1];
    best = layers[i].map((c) => {
      let pick = null;
      for (const prev of best) {
        const cost = prev.cost + transition(prev.path[prev.path.length - 1], c, interval) + c.cost;
        if (!pick || cost < pick.cost) pick = { cost, prev };
      }
      return { cost: pick.cost, path: [...pick.prev.path, c] };
    });
  }
  return best.reduce((a, b) => (b.cost < a.cost ? b : a));
}

// La tonique grave est jouée à vide si c'est possible (Mi, La, Ré), sinon avec le doigt de référence (rootFinger).
function positionFingering(notes, rootFinger, zone) {
  const lowRoot = Math.min(...notes.filter((n) => n.root).map((n) => n.midi));
  const openRoot = (zone === 'auto' || zone === 'low') && OPEN.includes(lowRoot);
  const midis = notes.map((n) => n.midi);
  const layers = notes.map((n) => {
    const list = candidates(n.midi, zone);
    if (n.midi === lowRoot) {
      list.forEach((c) => {
        if (openRoot) { if (c.finger !== 0) c.cost += 5; }
        else if (c.finger !== rootFinger && c.finger !== 0) c.cost += 1.5;
      });
    }
    return list;
  });
  return bestPath(midis, layers);
}

function positionBlock(type, pc, range, zone) {
  const s = SCALE_TYPES[type];
  if (range === 'neck') {
    const notes = notesBetween(type, pc, LOW_E, NECK_TOP);
    return [{ suffix: '', notes, fingering: positionFingering(notes, s.rootFinger, 'auto').path }];
  }
  // En zone médium ou aiguë, on essaie aussi une octave plus haut et on garde le plus jouable.
  let best = null;
  for (const shift of zone === 'auto' || zone === 'low' ? [0] : [0, 12]) {
    const root = lowestRoot(pc) + shift;
    const top = root + 12 * Number(range);
    if (top > OPEN[3] + MAX_FRET) continue;
    const notes = notesBetween(type, pc, root, top);
    const r = positionFingering(notes, s.rootFinger, zone);
    if (!best || r.cost < best.cost) best = { cost: r.cost, notes, fingering: r.path };
  }
  return [{ suffix: '', notes: best.notes, fingering: best.fingering }];
}

// ---------- Doigté « 3 notes par corde » ----------
// Chaque corde joue 3 notes (2 en pentatonique), puis on passe à la suivante ;
// au-delà de la corde de G, on continue sur G en remontant le manche.

// Doigt d'une note dans un groupe sur une corde, selon l'écart entre la 1re et la dernière case.
function fingerInGroup(d, span) {
  if (span <= 3) return d + 1;                         // un doigt par case
  if (d === 0) return 1;
  if (d === span) return 4;
  return 2;                                            // ton + ton : 1-2-4 en extension
}

function assign3nps(notes, s0, per) {
  const out = notes.map((n, i) => {
    const string = Math.min(3, s0 + Math.floor(i / per));
    return { string, fret: n.midi - OPEN[string] };
  });
  for (let i = 0; i < out.length; i += per) {
    const group = out.slice(i, i + per);
    const fretted = group.filter((x) => x.fret > 0);
    if (!fretted.length) { group.forEach((x) => { x.finger = 0; }); continue; }
    // Avec une corde à vide dans le groupe, la main est en 1re position (doigt = case).
    const base = group.some((x) => x.fret === 0) ? 1 : Math.min(...fretted.map((x) => x.fret));
    const span = Math.max(...fretted.map((x) => x.fret)) - base;
    group.forEach((x) => { x.finger = x.fret === 0 ? 0 : fingerInGroup(x.fret - base, span); });
  }
  return out;
}

const ZONE_TARGET = { low: 2, mid: 7, high: 13 };

function threeNpsBlock(type, pc, range, zone) {
  const per = SCALE_TYPES[type].steps.length === 5 ? 2 : 3;
  // Départ possible : tonique sur la corde de E ou de A, à n'importe quelle octave jouable,
  // ou sur la corde de D à vide pour une octave (Ré).
  const options = [];
  for (const s0 of [0, 1, 2]) {
    for (let f = 0; f <= 15; f++) {
      if (s0 === 2 && (f > 0 || range !== '1')) continue;
      const root = OPEN[s0] + f;
      if ((root - pc) % 12 !== 0) continue;
      const top = range === 'neck' ? Math.max(root + 24, 60) : root + 12 * Number(range);
      const notes = notesBetween(type, pc, root, top);
      const fingering = assign3nps(notes, s0, per);
      if (fingering.every((x) => x.fret >= 0 && x.fret <= MAX_FRET)) options.push({ s0, f, notes, fingering });
    }
  }
  // Tonique sur une corde à vide dès que possible (La sur A à vide plutôt qu'en case 5 sur E),
  // sinon corde de E d'abord, le plus bas possible ; en zone, au plus près de la case visée.
  const score = (o) => zone === 'auto' || range === 'neck'
    ? (o.f === 0 ? -1 : o.s0 * 100 + o.f)
    : Math.abs(o.f - ZONE_TARGET[zone]) + o.s0 * 0.5 - (zone === 'low' && o.f === 0 ? 1 : 0);
  if (!options.length) return positionBlock(type, pc, range, zone);   // trop haut pour 3 notes par corde
  const best = options.reduce((a, b) => (score(b) < score(a) ? b : a));
  return [{ suffix: '', notes: best.notes, fingering: best.fingering }];
}

// ---------- Boxes ----------
// Box n : la forme qui commence par le n-ième degré de la gamme sur la corde de E,
// avec 2 notes par corde (pentatonique, sur 4 cases) ou 3 notes par corde (sur 5 cases).
// On joue toutes ses notes, de la plus grave à la plus aiguë.

function boxNotes(type, pc, w, width) {
  const sp = speller(type, pc);
  const notes = [];
  for (let string = 0; string < 4; string++) {
    for (let f = w; f <= w + width; f++) {
      const note = sp(OPEN[string] + f);
      if (note) notes.push({ ...note, string, fret: f });
    }
  }
  return notes;
}

// Zone de la box qui commence au degré joué en case a de la corde de E :
// la plus proche de a où chaque corde a le bon nombre de notes.
function boxWindow(type, pc, a) {
  const per = SCALE_TYPES[type].steps.length === 5 ? 2 : 3;
  const width = per === 2 ? 3 : 4;
  let fallback = null;
  for (let w = a; w >= Math.max(0, a - 3); w--) {
    const notes = boxNotes(type, pc, w, width);
    const counts = [0, 1, 2, 3].map((st) => notes.filter((x) => x.string === st).length);
    const lowE = Math.min(...notes.filter((x) => x.string === 0).map((x) => x.fret));
    if (lowE !== a) continue;   // la box doit commencer par ce degré sur la corde de E
    if (counts.every((c) => c === per)) return w;
    if (fallback == null && counts.every((c) => c >= per)) fallback = w;
  }
  return fallback ?? Math.max(0, a - 1);
}

function boxBlock(type, pc, w, n) {
  const width = SCALE_TYPES[type].steps.length === 5 ? 3 : 4;
  const a = w;
  const notes = boxNotes(type, pc, w, width);
  notes.sort((x, y) => x.midi - y.midi);
  // Doigts : index sur la case a (ou a+1 si la box s'étend sur 5 cases), le moins de déplacements possible.
  const p0 = Math.max(1, a);
  const layers = notes.map((note) => [p0, p0 + 1].flatMap((p) => {
    if (note.fret === 0) return [{ string: note.string, fret: 0, p, finger: 0, cost: 0 }];
    const k = note.fret - p;
    if (k < -1 || k > 3) return [];
    return [{ string: note.string, fret: note.fret, p, finger: k <= 0 ? 1 : k + 1, cost: k === -1 ? 0.6 : 0 }];
  }));
  const { path } = bestPath(notes.map((x) => x.midi), layers);
  return { suffix: ` · Box ${n} (cases ${a}–${a + width})`, notes, fingering: path };
}

function boxBlocks(type, pc, box) {
  const s = SCALE_TYPES[type];
  const width = s.steps.length === 5 ? 3 : 4;
  const r = (pc - 4 + 12) % 12;                       // case de la tonique sur la corde de E
  const starts = s.steps.map((st, i) => ({ n: i + 1, a: (r + st) % 12 }));
  if (box !== 'all') {
    const { n, a } = starts[Number(box) - 1];
    return [boxBlock(type, pc, boxWindow(type, pc, a), n)];
  }
  // Toutes : de la plus basse à la plus haute, en répétant les boxes à l'octave tant que le manche le permet.
  const all = [];
  for (const shift of [0, 12]) {
    for (const { n, a } of starts) {
      const w = boxWindow(type, pc, a + shift);
      if (w + width <= MAX_FRET) all.push({ n, w });
    }
  }
  return all.sort((x, y) => x.w - y.w).map(({ n, w }) => boxBlock(type, pc, w, n));
}

// ---------- Exercice ----------

function ordered(items, direction) {
  const down = [...items].reverse();
  if (direction === 'up') return items;
  if (direction === 'down') return down;
  return [...items, ...down.slice(1)];   // aller-retour, sans répéter la note du haut
}

// Construit l'exercice : événements, accords par mesure, textes de position, et un résumé par bloc.
// rhythm = nombre de notes par temps (1 noires, 2 croches, 3 triolets).
export function buildScaleExercise({ type, key, range, direction, rhythm, fingering = '3nps', zone = 'auto', box = 'all' }, bpb = 4) {
  const s = SCALE_TYPES[type];
  const startPc = s.minor ? 9 : 0;   // le cycle commence en La mineur / Do majeur
  const pcs = key === 'all'
    ? Array.from({ length: 12 }, (_, i) => (startPc + i * 5) % 12)
    : [Number(key)];

  const events = [], chordBars = [], labels = [], keys = [];
  const dt = 1 / rhythm;
  let bar = 0;

  for (const pc of pcs) {
    const blocks = fingering === 'boxes' ? boxBlocks(type, pc, box)
      : fingering === 'position' ? positionBlock(type, pc, range, zone)
      : threeNpsBlock(type, pc, range, zone);
    const k = (s.minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
    const name = keyName(pc, s.minor);

    for (const block of blocks) {
      // Le doigté est calculé en montant ; la descente le reprend à l'envers.
      const seq = ordered(block.notes.map((n, i) => ({ ...n, f: block.fingering[i] })), direction);
      const start = bar * bpb;
      seq.forEach((n, i) => {
        const t = start + i * dt;
        const last = i === seq.length - 1;
        // La dernière note est tenue jusqu'à la fin de la mesure (au moins un temps).
        const end = last ? Math.ceil((t + 1) / bpb) * bpb - 0.1 : t + dt * 0.9;
        events.push({
          t, dur: end - t, midi: n.midi, name: n.name, sig: keyFifths(pc, s.minor), vel: n.root ? 0.9 : 0.75,
          string: 3 - n.f.string, fret: n.f.fret, finger: n.f.finger,   // corde au format de la tab (0 = G)
        });
      });
      const lastT = start + (seq.length - 1) * dt;
      const bars = Math.ceil((lastT + 1) / bpb) - bar;
      for (let b = 0; b < bars; b++) {
        chordBars.push([k + s.chord]);
        labels.push(`${name} · ${s.label}${block.suffix} · Mesure ${b + 1}/${bars}`);
      }
      keys.push({ label: `Gamme ${s.label.toLowerCase()} de ${name}${block.suffix}`, startBar: bar, bars, names: seq.map((n) => n.name) });
      bar += bars;
    }
  }
  return { events, chordBars, labels, keys, bars: bar };
}
