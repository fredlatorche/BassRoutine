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
  el('path', {
    d: `M 8 ${fLine} C 8 ${fLine - 10}, 22 ${fLine - 12}, 24 ${fLine - 2} C 26 ${fLine + 8}, 18 ${fLine + 18}, 6 ${fLine + 26}`,
    class: 'staff-clef-curve',
  }, svg);
  el('circle', { cx: 8, cy: fLine, r: 3.2, class: 'staff-ink' }, svg);
  el('circle', { cx: 29, cy: fLine - 4, r: 1.8, class: 'staff-ink' }, svg);
  el('circle', { cx: 29, cy: fLine + 4, r: 1.8, class: 'staff-ink' }, svg);
  signatureLetters(fifths).forEach((letter, i) => {
    const d = fifths > 0 ? SIG_SHARP_D[letter] : SIG_FLAT_D[letter];
    const t = el('text', { x: 36 + i * 8, y: yOf(d) + (fifths > 0 ? 5 : 3), class: 'staff-acc' }, svg);
    t.textContent = fifths > 0 ? '♯' : '♭';
  });
  return svg;
}

// Dessine la portée ; renvoie le SVG et, pour chaque événement, son groupe (pour l'allumer en lecture).
// doubles : positions (en temps) des doubles barres (fin / début de boucle).
export function renderStaff(events, totalBeats, bpb, beatW, doubles = []) {
  const width = totalBeats * beatW + 8;
  const svg = el('svg', { width, height: STAFF_H, class: 'staff' });
  el('rect', { width, height: STAFF_H, class: 'staff-bg' }, svg);
  staffLines(svg, width);
  for (let b = 0; b * bpb <= totalBeats; b++) {
    const x = b * bpb * beatW;
    el('line', { x1: x, x2: x, y1: BOTTOM - 8 * STEP, y2: BOTTOM, class: 'staff-bar' }, svg);
    if (doubles.includes(b * bpb)) el('line', { x1: x - 4, x2: x - 4, y1: BOTTOM - 8 * STEP, y2: BOTTOM, class: 'staff-bar' }, svg);
  }

  let barIdx = -1, shown = new Map();   // altérations déjà écrites dans la mesure
  const groups = events.map((e, i) => {
    const x = e.t * beatW + 12;
    const { d, acc } = spelling(e.midi, e.name);
    const y = yOf(d);
    const g = el('g', { class: 'staff-note' }, svg);

    // Lignes supplémentaires.
    for (let ld = D_BOTTOM - 2; ld >= d; ld -= 2) el('line', { x1: x - 9, x2: x + 9, y1: yOf(ld), y2: yOf(ld), class: 'staff-line' }, g);
    for (let ld = D_TOP + 2; ld <= d; ld += 2) el('line', { x1: x - 9, x2: x + 9, y1: yOf(ld), y2: yOf(ld), class: 'staff-line' }, g);

    // Altération : seulement si elle diffère de l'armure (e.sig) ou de ce qui est déjà écrit dans la mesure.
    const bar = Math.floor(e.t / bpb);
    if (bar !== barIdx) { barIdx = bar; shown = new Map(); }
    if ((shown.get(d) ?? sigAcc(d % 7, e.sig ?? 0)) !== acc) {
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
    if (value > 1) {
      const up = d < D_MIDDLE;
      const sx = up ? x + 4.8 : x - 4.8;
      const sy = up ? y - 28 : y + 28;
      el('line', { x1: sx, x2: sx, y1: y, y2: sy, class: 'staff-stem' }, g);
      const flags = value === 8 ? 1 : value === 16 ? 2 : 0;
      for (let k = 0; k < flags; k++) {
        const fy = up ? sy + k * 6 : sy - k * 6;
        el('path', { d: `M ${sx} ${fy} q 7 ${up ? 6 : -6} 5 ${up ? 14 : -14}`, class: 'staff-stem' }, g);
      }
    }
    return g;
  });
  return { svg, groups };
}
