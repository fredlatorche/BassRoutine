// Mode aléatoire du mode Boucle : invente une grille d'accords typique dans une tonalité
// (majeure ou mineure) et une walking bass qui tourne en boucle dessus.

import { walkingQuarters } from './walking.js';
import { keyName } from './scales.js';
import { keyFifths } from './spelling.js';

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

export const KEY_CHOICES = ['Do', 'Do♯ / Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭ / Sol♯', 'La', 'Si♭', 'Si'];

// Nom anglais de la fondamentale (pour le symbole d'accord), avec la bonne lettre.
function spellEn(letterIdx, pc) {
  const acc = ((pc - NATURAL[letterIdx] + 18) % 12) - 6;
  return LETTERS[letterIdx] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
}

function chordSymbol(pc, minor, [degree, quality]) {
  const key = (minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
  const letter = (LETTERS.indexOf(key[0]) + degree - 1) % 7;
  const rootPc = (pc + (minor ? MINOR_SCALE : MAJOR_SCALE)[degree - 1]) % 12;
  return spellEn(letter, rootPc) + quality;
}

// key : 0 à 11 ou 'random' ; mode : 'major', 'minor' ou 'random' ; register : 'low' ou 'high'.
// Renvoie { chords (un par mesure), line (une note MIDI par temps), label, fifths (armure) }.
export function inventLoop({ key, mode, register, bars }, rand = Math.random) {
  const pc = key === 'random' ? Math.floor(rand() * 12) : Number(key);
  const minor = mode === 'random' ? rand() < 0.4 : mode === 'minor';
  const templates = minor ? MINOR_TEMPLATES : MAJOR_TEMPLATES;
  const table = minor ? MINOR_CHORDS : MAJOR_CHORDS;

  const picked = Array.from({ length: Math.max(1, bars / 4) }, () => templates[Math.floor(rand() * templates.length)]);
  const chords = picked.flat().map((r) => chordSymbol(pc, minor, table[r]));

  let line = walkingQuarters(chords.map((c) => ({ chords: [c] })), Math.floor(rand() * 1e9)).map((e) => e.midi);
  if (register === 'high') line = line.map((m) => m + 12);   // une octave plus haut : cordes de D et G

  const label = `${keyName(pc, minor)} ${minor ? 'mineur' : 'majeur'} · ${picked.map((t) => t.join('–')).join('  |  ')}`;
  return { chords, line, label, fifths: keyFifths(pc, minor) };
}
