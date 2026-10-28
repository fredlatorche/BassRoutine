// Exercices de gammes : toutes les tonalités, 1 ou 2 octaves ou tout le manche,
// en montant, en descendant ou aller-retour. Les notes sont orthographiées
// correctement (Si♭ en Fa majeur, Fa♯ en Sol majeur…).

import { LOW_E } from './theory.js';

const LETTERS = 'CDEFGAB';
const FR = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const NECK_TOP = 55;   // Sol, case 12 de la corde de G

// steps : intervalles depuis la tonique ; degrees : degré (0 à 6) de chaque note, pour le nom.
export const SCALE_TYPES = {
  major: { label: 'Majeure', steps: [0, 2, 4, 5, 7, 9, 11], degrees: [0, 1, 2, 3, 4, 5, 6], minor: false, chord: 'maj7' },
  minor: { label: 'Mineure naturelle', steps: [0, 2, 3, 5, 7, 8, 10], degrees: [0, 1, 2, 3, 4, 5, 6], minor: true, chord: 'm7' },
  harmonic: { label: 'Mineure harmonique', steps: [0, 2, 3, 5, 7, 8, 11], degrees: [0, 1, 2, 3, 4, 5, 6], minor: true, chord: 'm' },
  pentaMajor: { label: 'Pentatonique majeure', steps: [0, 2, 4, 7, 9], degrees: [0, 1, 2, 4, 5], minor: false, chord: '6' },
  pentaMinor: { label: 'Pentatonique mineure', steps: [0, 3, 5, 7, 10], degrees: [0, 2, 3, 4, 6], minor: true, chord: 'm7' },
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

// Notes d'une gamme dans une tonalité, dans l'étendue demandée, de la plus grave à la plus aiguë.
function scaleNotes(type, pc, range) {
  const s = SCALE_TYPES[type];
  const k = (s.minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
  const keyLetter = LETTERS.indexOf(k[0]);
  const root = LOW_E + ((pc - 4 + 12) % 12);   // tonique la plus grave de la basse
  const [lo, hi] = range === 'neck' ? [LOW_E, NECK_TOP] : [root, root + 12 * Number(range)];
  const notes = [];
  for (let m = lo; m <= hi; m++) {
    const i = s.steps.indexOf((m - pc + 120) % 12);
    if (i >= 0) notes.push({ midi: m, name: spell((keyLetter + s.degrees[i]) % 7, m % 12), root: i === 0 });
  }
  return notes;
}

function ordered(notes, direction) {
  const down = [...notes].reverse();
  if (direction === 'up') return notes;
  if (direction === 'down') return down;
  return [...notes, ...down.slice(1)];   // aller-retour, sans répéter la note du haut
}

// Construit l'exercice : événements, accords par mesure, textes de position, et un résumé par tonalité.
// rhythm = nombre de notes par temps (1 noires, 2 croches, 3 triolets).
export function buildScaleExercise({ type, key, range, direction, rhythm }, bpb = 4) {
  const s = SCALE_TYPES[type];
  const startPc = s.minor ? 9 : 0;   // le cycle commence en La mineur / Do majeur
  const pcs = key === 'all'
    ? Array.from({ length: 12 }, (_, i) => (startPc + i * 5) % 12)
    : [Number(key)];

  const events = [], chordBars = [], labels = [], keys = [];
  const dt = 1 / rhythm;
  let bar = 0;

  for (const pc of pcs) {
    const seq = ordered(scaleNotes(type, pc, range), direction);
    const start = bar * bpb;
    seq.forEach((n, i) => {
      const t = start + i * dt;
      const last = i === seq.length - 1;
      // La dernière note est tenue jusqu'à la fin de la mesure (au moins un temps).
      const end = last ? Math.ceil((t + 1) / bpb) * bpb - 0.1 : t + dt * 0.9;
      events.push({ t, dur: end - t, midi: n.midi, name: n.name, vel: n.root ? 0.9 : 0.75 });
    });
    const lastT = start + (seq.length - 1) * dt;
    const bars = Math.ceil((lastT + 1) / bpb) - bar;

    const k = (s.minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
    const name = keyName(pc, s.minor);
    for (let b = 0; b < bars; b++) {
      chordBars.push([k + s.chord]);
      labels.push(`${name} · ${s.label} · Mesure ${b + 1}/${bars}`);
    }
    keys.push({ label: `Gamme ${s.label.toLowerCase()} de ${name}`, startBar: bar, bars, names: seq.map((n) => n.name) });
    bar += bars;
  }
  return { events, chordBars, labels, keys, bars: bar };
}
