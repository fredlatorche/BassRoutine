// Orthographe des notes selon les règles d'écriture : armure de la tonalité,
// notes de l'accord nommées depuis sa fondamentale (Sol♯ dans Mi7, Si♭ dans Do7…),
// notes de passage chromatiques en dièse en montant et en bémol en descendant.
// La tonalité est donnée par son armure : nombre de dièses (> 0) ou de bémols (< 0).

import { parseChord } from './theory.js';

const FR = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const LETTER_OF = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];   // Fa Do Sol Ré La Mi Si
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];    // Si Mi La Ré Sol Do Fa
// Intervalle (demi-tons depuis la fondamentale) -> écart de lettres (tierce = 2, quinte = 4…).
const LETTER_STEP = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6];
const AWKWARD = new Set(['Fa♭', 'Do♭', 'Mi♯', 'Si♯']);

// Armures usuelles des tonalités, par hauteur de la tonique (0 = Do).
const MAJOR_FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];     // Do Ré♭ Ré Mi♭ Mi Fa Fa♯ Sol La♭ La Si♭ Si
const MINOR_FIFTHS = [-3, 4, -1, -6, 1, -4, 3, -2, 5, 0, -5, 2];    // Do Do♯ Ré Mi♭ Mi Fa Fa♯ Sol Sol♯ La Si♭ Si

export const keyFifths = (pc, minor) => (minor ? MINOR_FIFTHS : MAJOR_FIFTHS)[pc];

// Altération que l'armure donne à une lettre (0 à 6).
export function sigAcc(letter, fifths) {
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(letter) ? 1 : 0;
  if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(letter) ? -1 : 0;
  return 0;
}

// Lettres de l'armure, dans l'ordre où on les écrit à la clé.
export const signatureLetters = (fifths) => (fifths >= 0 ? SHARP_ORDER.slice(0, fifths) : FLAT_ORDER.slice(0, -fifths));

const accText = (a) => (a > 0 ? '♯'.repeat(a) : '♭'.repeat(-a));

function nameOf(letter, pc) {
  const acc = ((pc - NATURAL[letter] + 18) % 12) - 6;
  return { acc, name: FR[letter] + accText(acc) };
}

// Hauteur (0 à 11) -> lettre, pour les notes de la gamme de la tonalité.
function keyLetters(fifths) {
  const map = new Map();
  for (let l = 0; l < 7; l++) map.set((NATURAL[l] + sigAcc(l, fifths) + 12) % 12, l);
  return map;
}

// Nom d'une hauteur seule dans une tonalité (menus de la grille) : gamme, sinon dièse ou bémol selon l'armure.
export function pitchName(midi, fifths) {
  const pc = midi % 12;
  const diatonic = keyLetters(fifths);
  if (diatonic.has(pc)) return nameOf(diatonic.get(pc), pc).name;
  const letter = fifths < 0 ? diatonic.get((pc + 1) % 12) : diatonic.get((pc + 11) % 12);
  return nameOf(letter, pc).name;
}

// Donne un nom (name) et l'armure (sig) à chaque note d'une ligne.
// chordAt(t) : symbole de l'accord joué au temps t (ou null).
export function spellEvents(events, chordAt, fifths) {
  const diatonic = keyLetters(fifths);
  return events.map((e, i) => {
    if (e.name) return { ...e, sig: e.sig ?? fifths };
    const pc = e.midi % 12;
    let letter = null;

    // 1. Note de l'accord : nommée depuis la fondamentale de l'accord.
    const sym = chordAt?.(e.t);
    if (sym) {
      const chord = parseChord(sym);
      const iv = (pc - chord.pc + 12) % 12;
      if (chord.tones.includes(iv)) {
        const dim7 = iv === 9 && chord.tones[1] === 3 && chord.tones[2] === 6 && chord.tones[3] === 9;
        letter = (LETTER_OF[sym[0]] + (dim7 ? 6 : LETTER_STEP[iv])) % 7;
        if (Math.abs(nameOf(letter, pc).acc) > 1) letter = null;
      }
    }

    // 2. Note de la gamme de la tonalité.
    if (letter == null && diatonic.has(pc)) letter = diatonic.get(pc);

    // 3. Note chromatique : en montant, on hausse la note du dessous ; en descendant, on baisse celle du dessus.
    if (letter == null) {
      const next = events[i + 1], prev = events[i - 1];
      const up = next ? next.midi > e.midi : prev ? prev.midi < e.midi : fifths >= 0;
      const raised = diatonic.get((pc + 11) % 12);
      const lowered = diatonic.get((pc + 1) % 12);
      const options = (up ? [raised, lowered] : [lowered, raised]).filter((l) => l != null);
      letter = options.find((l) => {
        const n = nameOf(l, pc);
        return Math.abs(n.acc) <= 1 && !AWKWARD.has(n.name);   // pas de Do♭, Mi♯… ni de double altération
      }) ?? options[0];
    }

    return { ...e, name: nameOf(letter, pc).name, sig: fifths };
  });
}
