// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Théorie : noms de notes, symboles d'accord, gammes associées.

export const NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const LOW_E = 28;   // Mi grave (E1), corde à vide
export const HIGH = 48;    // Do (C3), haut de la tessiture utilisée

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];

// Notes de l'accord (intervalles) et mode joué dessus.
const QUALITIES = {
  '': { tones: [0, 4, 7], scale: IONIAN },
  '6': { tones: [0, 4, 7, 9], scale: IONIAN },
  'maj7': { tones: [0, 4, 7, 11], scale: IONIAN },
  'm': { tones: [0, 3, 7], scale: DORIAN },
  'm7': { tones: [0, 3, 7, 10], scale: DORIAN },
  'm6': { tones: [0, 3, 7, 9], scale: [0, 2, 3, 5, 7, 9, 11] },
  '7': { tones: [0, 4, 7, 10], scale: MIXO },
  '7b9': { tones: [0, 4, 7, 10], scale: [0, 1, 3, 4, 6, 7, 9, 10] },
  'm7b5': { tones: [0, 3, 6, 10], scale: [0, 1, 3, 5, 6, 8, 10] },
  'dim7': { tones: [0, 3, 6, 9], scale: [0, 2, 3, 5, 6, 8, 9, 11] },
};

const cache = new Map();

// « Ebm7 » -> { symbol, label, pc, tones, scale }
export function parseChord(symbol) {
  if (cache.has(symbol)) return cache.get(symbol);
  const m = /^([A-G])([#b]?)(.*)$/.exec(symbol);
  if (!m) throw new Error(`Accord inconnu : ${symbol}`);
  const pc = (LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const q = QUALITIES[m[3].replace(/^-/, 'm')] ?? QUALITIES[''];
  const chord = {
    symbol,
    label: symbol.replace(/^([A-G])b/, '$1♭').replace(/^([A-G])#/, '$1♯'),
    pc,
    tones: q.tones,
    scale: q.scale,
    minor: q.tones[1] === 3,
  };
  cache.set(symbol, chord);
  return chord;
}

// Fondamentale dans le registre grave (entre Mi grave et Ré#).
export const bassRoot = (chord) => LOW_E + ((chord.pc - 4 + 12) % 12);

// Accord pour le synthé. Accords de 4 sons : voicing « sans fondamentale » (la basse la joue déjà)
// avec la 9e (ou la ♭9, ou l'octave si la gamme n'en a pas). Note la plus grave entre Ré3 et Do#4.
export function padVoicing(chord) {
  let ints = chord.tones;
  if (ints.length === 4) {
    const ninth = chord.scale.includes(2) ? 14 : chord.scale.includes(1) ? 13 : 12;
    ints = [...ints.slice(1), ninth];
  }
  let low = chord.pc + ints[0];
  while (low < 50) low += 12;
  while (low > 61) low -= 12;
  return ints.map((i) => low + i - ints[0]);
}

// Toutes les notes de la tessiture qui appartiennent à un ensemble d'intervalles de l'accord.
export function notesInRange(chord, intervals, lo = LOW_E, hi = HIGH) {
  const out = [];
  for (let m = lo; m <= hi; m++) {
    if (intervals.includes((m - chord.pc + 12) % 12)) out.push(m);
  }
  return out;
}
