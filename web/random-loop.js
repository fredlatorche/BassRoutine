// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Mode aléatoire du mode Boucle : invente une grille d'accords typique dans une tonalité
// (majeure ou mineure) et une walking bass qui tourne en boucle dessus.

import { walkingQuarters } from './walking.js';

const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

// Accords par chiffrage : [degré, qualité].
const MAJOR_CHORDS = {
  I: [1, 'maj7'], ii: [2, 'm7'], iii: [3, 'm7'], IV: [4, 'maj7'], V: [5, '7'], vi: [6, 'm7'],
  VI7: [6, '7'], I7: [1, '7'], IV7: [4, '7'],
};
const MINOR_CHORDS = {
  i: [1, 'm7'], 'ii°': [2, 'm7b5'], III: [3, 'maj7'], iv: [4, 'm7'], V: [5, '7'], VI: [6, 'maj7'], VII: [7, '7'],
};

// Enchaînements de 4 mesures courants en jazz et pop.
const MAJOR_TEMPLATES = [
  ['I', 'vi', 'ii', 'V'], ['ii', 'V', 'I', 'I'], ['I', 'IV', 'ii', 'V'],
  ['iii', 'vi', 'ii', 'V'], ['I', 'VI7', 'ii', 'V'], ['I7', 'IV7', 'I7', 'V'],
];
const MINOR_TEMPLATES = [
  ['i', 'iv', 'ii°', 'V'], ['i', 'VI', 'ii°', 'V'], ['i', 'iv', 'VII', 'III'],
  ['i', 'i', 'iv', 'V'], ['i', 'VI', 'iv', 'V'],
];

// Tonalités proposées, enharmoniques séparées (Do♯ et Ré♭ ne s'écrivent pas pareil).
export const KEY_CHOICES = [
  ['C', 'Do'], ['C#', 'Do♯'], ['Db', 'Ré♭'], ['D', 'Ré'], ['D#', 'Ré♯'], ['Eb', 'Mi♭'], ['E', 'Mi'],
  ['F', 'Fa'], ['F#', 'Fa♯'], ['Gb', 'Sol♭'], ['G', 'Sol'], ['G#', 'Sol♯'], ['Ab', 'La♭'], ['A', 'La'],
  ['A#', 'La♯'], ['Bb', 'Si♭'], ['B', 'Si'],
];
const KEY_LABEL = Object.fromEntries(KEY_CHOICES);

// Armure de chaque tonalité usuelle. Celles qui n'existent pas en pratique (Ré♯ majeur, Ré♭ mineur…)
// sont remplacées par leur équivalent enharmonique (Mi♭ majeur, Do♯ mineur…).
const MAJOR_FIFTHS = { C: 0, 'C#': 7, Db: -5, D: 2, Eb: -3, E: 4, F: -1, 'F#': 6, Gb: -6, G: 1, Ab: -4, A: 3, Bb: -2, B: 5 };
const MINOR_FIFTHS = { C: -3, 'C#': 4, D: -1, 'D#': 6, Eb: -6, E: 1, F: -4, 'F#': 3, G: -2, 'G#': 5, Ab: -7, A: 0, 'A#': 7, Bb: -5, B: 2 };
const ENHARMONIC = { 'C#': 'Db', Db: 'C#', 'D#': 'Eb', Eb: 'D#', 'F#': 'Gb', Gb: 'F#', 'G#': 'Ab', Ab: 'G#', 'A#': 'Bb', Bb: 'A#' };
// Armure d'après le texte affiché (« Ré♭ majeur ») : sert aux anciennes sauvegardes sans armure.
export function fifthsFromLabel(label) {
  const m = /(\S+) (majeur|mineur)/.exec(label ?? '');
  if (!m) return null;
  const name = Object.keys(KEY_LABEL).find((k) => KEY_LABEL[k] === m[1]);
  return (m[2] === 'mineur' ? MINOR_FIFTHS : MAJOR_FIFTHS)[name] ?? null;
}

const pcOf = (name) => (NATURAL[LETTERS.indexOf(name[0])] + (name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0) + 12) % 12;

// Nom anglais de la fondamentale (pour le symbole d'accord), avec la bonne lettre.
function spellEn(letterIdx, pc) {
  const acc = ((pc - NATURAL[letterIdx] + 18) % 12) - 6;
  return LETTERS[letterIdx] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
}

function chordSymbol(key, minor, [degree, quality]) {
  const pc = pcOf(key);
  const letter = (LETTERS.indexOf(key[0]) + degree - 1) % 7;
  const rootPc = (pc + (minor ? MINOR_SCALE : MAJOR_SCALE)[degree - 1]) % 12;
  return spellEn(letter, rootPc) + quality;
}

// key : nom anglais ('Db', 'C#'…) ou 'random' ; mode : 'major', 'minor' ou 'random' ; register : 'low' ou 'high'.
// Renvoie { chords (un par mesure), line (une note MIDI par temps), label, fifths (armure) }.
export function inventLoop({ key, mode, register, bars }, rand = Math.random) {
  const minor = mode === 'random' ? rand() < 0.4 : mode === 'minor';
  const fifthsTable = minor ? MINOR_FIFTHS : MAJOR_FIFTHS;
  let name = key in KEY_LABEL ? key : (minor ? MINOR_KEYS : MAJOR_KEYS)[Math.floor(rand() * 12)];   // 'random' ou valeur inconnue
  if (!(name in fifthsTable)) name = ENHARMONIC[name];
  const templates = minor ? MINOR_TEMPLATES : MAJOR_TEMPLATES;
  const table = minor ? MINOR_CHORDS : MAJOR_CHORDS;

  const picked = Array.from({ length: Math.max(1, bars / 4) }, () => templates[Math.floor(rand() * templates.length)]);
  const chords = picked.flat().map((r) => chordSymbol(name, minor, table[r]));

  let line = walkingQuarters(chords.map((c) => ({ chords: [c] })), Math.floor(rand() * 1e9)).map((e) => e.midi);
  if (register === 'high') line = line.map((m) => m + 12);   // une octave plus haut : cordes de D et G

  const label = `${KEY_LABEL[name]} ${minor ? 'mineur' : 'majeur'} · ${picked.map((t) => t.join('–')).join('  |  ')}`;
  return { chords, line, label, fifths: fifthsTable[name] };
}
