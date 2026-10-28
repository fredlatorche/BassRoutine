// Exercices de gammes : toutes les tonalités, 1 ou 2 octaves ou tout le manche,
// en montant, en descendant ou aller-retour. Les notes sont orthographiées
// correctement (Si♭ en Fa majeur, Fa♯ en Sol majeur…).

import { LOW_E } from './theory.js';

const LETTERS = 'CDEFGAB';
const FR = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const NECK_TOP = 55;   // Sol, case 12 de la corde de G

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

// ---------- Doigtés ----------
// Jeu « en position » : la main couvre 4 cases (un doigt par case, index sur la case p),
// avec extension possible de l'index d'une case vers le bas. On cherche la suite de positions
// qui demande le moins de déplacements de main (programmation dynamique sur toute la gamme) :
// les notes passent donc d'une corde à l'autre au lieu de remonter le long d'une seule corde.
// Doigtés de référence retrouvés ainsi : majeure 2-4 | 1-2-4 | 1-3-4, penta mineure 1-4 | 1-3 | 1-3.

const OPEN = [28, 33, 38, 43];   // cordes à vide E, A, D, G (de la plus grave à la plus aiguë)
const MAX_FRET = 20;
const MAX_POS = 17;

function candidates(midi) {
  const out = [];
  OPEN.forEach((open, string) => {
    const fret = midi - open;
    if (fret < 0 || fret > MAX_FRET) return;
    for (let p = 1; p <= MAX_POS; p++) {
      let finger, cost;
      if (fret === 0) {
        [finger, cost] = [0, 0.3];                      // corde à vide : utile en bas du manche (Mi, Fa…)
      } else {
        const k = fret - p;                              // -1 (extension de l'index) à 3 (auriculaire)
        if (k < -1 || k > 3) continue;
        finger = k <= 0 ? 1 : k + 1;
        cost = k === -1 ? 0.6 : 0;
      }
      out.push({ string, fret, p, finger, cost: cost + p * 0.01 });   // à égalité, le bas du manche
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
  if ((interval > 0 && b.string < a.string) || (interval < 0 && b.string > a.string)) cost += 2;   // contre le sens de la gamme
  return cost;
}

// rootIdx : positions de la tonique grave, jouée avec le doigt de référence (rootFinger).
function fingerScale(midis, rootIdx, rootFinger) {
  const layers = midis.map((m, i) => {
    const list = candidates(m);
    if (rootIdx.includes(i)) list.forEach((c) => { if (c.finger !== rootFinger && c.finger !== 0) c.cost += 1.5; });
    return list;
  });
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
  return best.reduce((a, b) => (b.cost < a.cost ? b : a)).path;
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
    const lowRoot = Math.min(...seq.filter((n) => n.root).map((n) => n.midi));
    const rootIdx = seq.map((n, i) => (n.midi === lowRoot ? i : -1)).filter((i) => i >= 0);
    const fingering = fingerScale(seq.map((n) => n.midi), rootIdx, s.rootFinger);
    const start = bar * bpb;
    seq.forEach((n, i) => {
      const f = fingering[i];
      const t = start + i * dt;
      const last = i === seq.length - 1;
      // La dernière note est tenue jusqu'à la fin de la mesure (au moins un temps).
      const end = last ? Math.ceil((t + 1) / bpb) * bpb - 0.1 : t + dt * 0.9;
      events.push({
        t, dur: end - t, midi: n.midi, name: n.name, vel: n.root ? 0.9 : 0.75,
        string: 3 - f.string, fret: f.fret, finger: f.finger,   // corde au format de la tab (0 = G)
      });
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
