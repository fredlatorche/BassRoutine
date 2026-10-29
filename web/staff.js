// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Portée en clé de fa au-dessus de la tab (SVG), alignée sur la même échelle horizontale.
// Comme d'habitude pour la basse, les notes sont écrites une octave au-dessus du son réel.

import { sigAcc, signatureLetters } from './spelling.js';

export const STAFF_H = 110;   // hauteur de la zone de portée, en pixels

const SVG = 'http://www.w3.org/2000/svg';
const LETTER_FR = { Do: 0, Ré: 1, Mi: 2, Fa: 3, Sol: 4, La: 5, Si: 6 };
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const SHARPS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
const STEP = 4;          // un degré = un demi-interligne
const BOTTOM = 76;       // y de la ligne du bas (Sol)
const D_BOTTOM = 18;     // degré diatonique du Sol de la ligne du bas (octave 2 × 7 + 4)
const D_MIDDLE = 22;     // Ré de la ligne du milieu : en dessous, hampe vers le haut
const D_TOP = 26;        // La de la ligne du haut
const ACC_TEXT = { '-2': '♭♭', '-1': '♭', 0: '♮', 1: '♯', 2: '♯♯' };

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

// Degré diatonique écrit (lettre + octave) et altération, d'après le nom de la note s'il est donné
// (gammes : Si♭, Fa♯…), sinon avec des dièses.
function spelling(midi, name) {
  let letter, acc;
  const m = name && /^(Do|Ré|Mi|Fa|Sol|La|Si)(.*)$/.exec(name);
  if (m) {
    letter = LETTER_FR[m[1]];
    acc = (m[2].match(/♯/g)?.length ?? 0) - (m[2].match(/♭/g)?.length ?? 0);
  } else {
    [letter, acc] = SHARPS[midi % 12];
  }
  const written = midi + 12;
  const octave = Math.round((written - acc - NATURAL[letter]) / 12) - 1;
  return { d: octave * 7 + letter, acc };
}

const yOf = (d) => BOTTOM - (d - D_BOTTOM) * STEP;

function staffLines(svg, width) {
  for (let i = 0; i < 5; i++) {
    el('line', { x1: 0, x2: width, y1: BOTTOM - i * 2 * STEP, y2: BOTTOM - i * 2 * STEP, class: 'staff-line' }, svg);
  }
}

// Position (degré écrit) des altérations de l'armure en clé de fa, par lettre.
const SIG_SHARP_D = { 3: 24, 0: 21, 4: 25, 1: 22, 5: 19, 2: 23, 6: 20 };   // Fa Do Sol Ré La Mi Si
const SIG_FLAT_D = { 6: 20, 2: 23, 5: 19, 1: 22, 4: 18, 0: 21, 3: 17 };    // Si Mi La Ré Sol Do Fa

export const clefWidth = (fifths = 0) => 36 + Math.abs(fifths) * 8 + (fifths ? 6 : 0);

// Clé de fa et armure, pour la colonne de gauche (restent visibles pendant le défilement).
export function clefSvg(fifths = 0) {
  const width = clefWidth(fifths);
  const svg = el('svg', { width, height: STAFF_H, class: 'staff-clef' });
  el('rect', { width, height: STAFF_H, class: 'staff-bg' }, svg);
  staffLines(svg, width);
  const fLine = BOTTOM - 6 * STEP;   // la clé de fa entoure la 4e ligne (Fa)
  // Clé gravée : tête ronde sur la ligne de fa, crochet épais qui monte jusqu'à la ligne du haut
  // puis redescend en s'affinant ; deux points de part et d'autre de la ligne de fa.
  const y = (dy) => fLine + dy;
  el('path', {
    d: `M 5.2 ${y(-1.5)}
        C 6 ${y(-8.6)}, 14 ${y(-10.6)}, 19.6 ${y(-7.6)}
        C 25.6 ${y(-4.4)}, 26 ${y(4.6)}, 20.6 ${y(10.4)}
        C 15.6 ${y(15.8)}, 9.4 ${y(19.4)}, 3 ${y(22.6)}
        L 2.6 ${y(21.6)}
        C 8.2 ${y(18)}, 13.4 ${y(13.6)}, 16.2 ${y(8.6)}
        C 19.2 ${y(3.4)}, 19 ${y(-4.4)}, 14.6 ${y(-6.2)}
        C 11.4 ${y(-7.4)}, 8.4 ${y(-5.8)}, 7.8 ${y(-3.2)} Z`,
    class: 'staff-ink',
  }, svg);
  el('circle', { cx: 7.6, cy: y(0.2), r: 3.3, class: 'staff-ink' }, svg);
  el('circle', { cx: 29.5, cy: y(-4), r: 1.7, class: 'staff-ink' }, svg);
  el('circle', { cx: 29.5, cy: y(4), r: 1.7, class: 'staff-ink' }, svg);
  signatureLetters(fifths).forEach((letter, i) => {
    const d = fifths > 0 ? SIG_SHARP_D[letter] : SIG_FLAT_D[letter];
    const t = el('text', { x: 36 + i * 8, y: yOf(d) + (fifths > 0 ? 5 : 3), class: 'staff-acc' }, svg);
    t.textContent = fifths > 0 ? '♯' : '♭';
  });
  return svg;
}

// Crochet de croche gravé : forme pleine qui part du bout de la hampe et s'affine en s'incurvant.
// Toujours à droite de la hampe ; vers le bas pour une hampe montante, vers le haut sinon.
function flagPath(sx, sy, up) {
  const v = up ? 1 : -1;
  return `M ${sx} ${sy} C ${sx + 0.6} ${sy + 5 * v}, ${sx + 9.5} ${sy + 8 * v}, ${sx + 7.6} ${sy + 17.5 * v}`
    + ` C ${sx + 7.2} ${sy + 11.5 * v}, ${sx + 3.6} ${sy + 8.6 * v}, ${sx} ${sy + 7.2 * v} Z`;
}

// Dessine la portée ; renvoie le SVG et, pour chaque événement, son groupe (pour l'allumer en lecture).
// doubles : positions (en temps) des doubles barres (fin / début de boucle).
// everyNote : mode novice, l'altération est écrite sur chaque note altérée (même si l'armure l'indique déjà).
// xAt(t) : abscisse du centre de la note, fournie par la tab (même placement des deux côtés).
export function renderStaff(events, totalBeats, bpb, beatW, doubles = [], everyNote = false, xAt = (t) => t * beatW + 20) {
  const width = totalBeats * beatW + 8;
  const svg = el('svg', { width, height: STAFF_H, class: 'staff' });
  el('rect', { width, height: STAFF_H, class: 'staff-bg' }, svg);
  staffLines(svg, width);
  for (let b = 0; b * bpb <= totalBeats; b++) {
    const x = b * bpb * beatW;
    // Calées sur les barres de la tab : trait de 2 px à partir de x ; double barre = traits à x et x + 4.
    if (doubles.includes(b * bpb)) {
      for (const dx of [1, 5]) el('line', { x1: x + dx, x2: x + dx, y1: BOTTOM - 8 * STEP, y2: BOTTOM, class: 'staff-bar double' }, svg);
    } else {
      el('line', { x1: x + 1, x2: x + 1, y1: BOTTOM - 8 * STEP, y2: BOTTOM, class: 'staff-bar' }, svg);
    }
  }

  // 1. Têtes de notes, lignes supplémentaires et altérations ; valeur de chaque note.
  let barIdx = -1, shown = new Map();   // altérations déjà écrites dans la mesure
  const notes = events.map((e, i) => {
    const x = xAt(e.t);
    const { d, acc } = spelling(e.midi, e.name);
    const y = yOf(d);
    const g = el('g', { class: 'staff-note' }, svg);

    for (let ld = D_BOTTOM - 2; ld >= d; ld -= 2) el('line', { x1: x - 9, x2: x + 9, y1: yOf(ld), y2: yOf(ld), class: 'staff-line' }, g);
    for (let ld = D_TOP + 2; ld <= d; ld += 2) el('line', { x1: x - 9, x2: x + 9, y1: yOf(ld), y2: yOf(ld), class: 'staff-line' }, g);

    // Altération : seulement si elle diffère de l'armure (e.sig) ou de ce qui est déjà écrit dans la mesure.
    const bar = Math.floor(e.t / bpb);
    if (bar !== barIdx) { barIdx = bar; shown = new Map(); }
    const keyAcc = sigAcc(d % 7, e.sig ?? 0);
    const write = everyNote
      ? acc !== 0 || keyAcc !== 0                  // ♯/♭ sur chaque note altérée, ♮ si l'armure altère la lettre
      : (shown.get(d) ?? keyAcc) !== acc;
    if (write) {
      const t = el('text', { x: x - 15, y: y + 5, class: 'staff-acc' }, g);
      t.textContent = ACC_TEXT[acc];
      shown.set(d, acc);
    }

    // Valeur de la note d'après l'écart avec la suivante (la durée jouée est raccourcie).
    const next = events[i + 1];
    const span = next ? next.t - e.t : e.dur;
    const value = span >= 3.5 ? 1 : span >= 1.75 ? 2 : span >= 0.9 ? 4 : span >= 0.3 ? 8 : 16;
    el('ellipse', {
      cx: x, cy: y, rx: 5.2, ry: 3.8, transform: `rotate(-20 ${x} ${y})`,
      class: value <= 2 ? 'staff-head hollow' : 'staff-head',
    }, g);
    return { x, d, y, g, value, span, bar, beat: Math.floor(e.t + 1e-6), triplet: Math.abs(span - 1 / 3) < 0.04 };
  });

  // 2. Groupes ligaturés : croches et doubles croches consécutives d'un même temps.
  const beams = el('g', {}, svg);
  const beamGroups = [];
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.value < 8) continue;
    const group = [n];
    while (i + 1 < notes.length) {
      const m = notes[i + 1];
      if (m.value < 8 || m.beat !== n.beat || m.bar !== n.bar) break;
      group.push(m);
      i++;
    }
    beamGroups.push(group);
  }
  const inBeam = new Set(beamGroups.filter((gr) => gr.length > 1).flat());

  // 3. Hampes et crochets des notes seules (noires, blanches, croches isolées).
  for (const n of notes) {
    if (n.value === 1 || inBeam.has(n)) continue;
    const up = n.d < D_MIDDLE;
    const sx = up ? n.x + 4.8 : n.x - 4.8;
    const sy = up ? n.y - 28 : n.y + 28;
    el('line', { x1: sx, x2: sx, y1: n.y, y2: sy, class: 'staff-stem' }, n.g);
    const flags = n.value === 8 ? 1 : n.value === 16 ? 2 : 0;
    for (let k = 0; k < flags; k++) el('path', { d: flagPath(sx, up ? sy + k * 6 : sy - k * 6, up), class: 'staff-ink' }, n.g);
  }

  // 4. Ligatures : barre légèrement inclinée suivant la mélodie, hampes d'au moins 26 px.
  for (const gr of beamGroups) {
    if (gr.length < 2) continue;
    const up = gr.reduce((sum, n) => sum + n.d, 0) / gr.length < D_MIDDLE;
    const dir = up ? -1 : 1;
    const sxs = gr.map((n) => (up ? n.x + 4.8 : n.x - 4.8));
    const first = gr[0], last = gr[gr.length - 1];
    const slope = Math.max(-0.2, Math.min(0.2, (last.y - first.y) / (sxs[sxs.length - 1] - sxs[0]))) * 0.6;
    const ends = gr.map((n, k) => n.y + dir * 26 - slope * (sxs[k] - sxs[0]));
    const b0 = up ? Math.min(...ends) : Math.max(...ends);
    const beamY = (x) => b0 + slope * (x - sxs[0]);
    gr.forEach((n, k) => el('line', { x1: sxs[k], x2: sxs[k], y1: n.y, y2: beamY(sxs[k]), class: 'staff-stem' }, n.g));
    const bar = (xa, xb, offset) => {
      const t = 4.2 * -dir;   // épaisseur vers les têtes de notes
      const ya = beamY(xa) - dir * offset, yb = beamY(xb) - dir * offset;
      el('path', { d: `M ${xa} ${ya} L ${xb} ${yb} L ${xb} ${yb + t} L ${xa} ${ya + t} Z`, class: 'staff-ink' }, beams);
    };
    bar(sxs[0] - 0.6, sxs[sxs.length - 1] + 0.6, 0);
    // 2e barre entre doubles croches voisines (ou petit crochet de barre pour une double isolée dans le groupe).
    gr.forEach((n, k) => {
      if (n.value !== 16) return;
      if (gr[k + 1]?.value === 16) bar(sxs[k] - 0.6, sxs[k + 1] + 0.6, 6.5);
      else if (gr[k - 1]?.value !== 16) bar(k ? sxs[k] - 7 : sxs[k], k ? sxs[k] : sxs[k] + 7, 6.5);
    });
    if (gr.length === 3 && gr.every((n) => n.triplet || n === last)) {
      const mid = (sxs[0] + sxs[2]) / 2;
      const t = el('text', { x: mid, y: beamY(mid) + (up ? -6 : 14), class: 'staff-tuplet' }, beams);
      t.textContent = '3';
    }
  }

  const groups = notes.map((n) => n.g);
  return { svg, groups };
}
