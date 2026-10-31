// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Accompagnement aux accords : enchaînement des voicings (chaque accord prend la position la plus
// proche du précédent, comme un pianiste) et rythme selon le style (comping swing, bossa, funk…).

import { padVoicing } from './theory.js';

// Sons faits pour tenir les accords (pas de rythme) ; les autres « compent ».
export const HELD_SOUNDS = new Set(['pad', 'strings', 'organ', 'flute', 'brass']);

// ---------- Enchaînement des voicings ----------
// Candidats : les renversements du voicing de base, note la plus grave entre Ré3 et Fa4.
const LOW_MIN = 50, LOW_MAX = 65, TOP_MAX = 79, CENTER = 62;

function candidates(base) {
  const out = [];
  for (let k = 0; k < base.length; k++) {
    const inv = [...base.slice(k), ...base.slice(0, k).map((m) => m + 12)];
    for (let oct = -24; oct <= 24; oct += 12) {
      const c = inv.map((m) => m + oct);
      if (c[0] >= LOW_MIN && c[0] <= LOW_MAX && c[c.length - 1] <= TOP_MAX) out.push(c);
    }
  }
  return out;
}

const mean = (notes) => notes.reduce((a, b) => a + b, 0) / notes.length;

// Voicing de l'accord le plus proche de prev (null au départ : le plus proche du centre).
export function voiceLead(chord, prev) {
  const list = candidates(padVoicing(chord));
  let best = null, bestCost = Infinity;
  for (const c of list) {
    let cost = 0.3 * Math.abs(mean(c) - CENTER);   // sans s'éloigner de la tessiture au fil des accords
    if (prev) {
      cost += prev.length === c.length
        ? c.reduce((sum, m, i) => sum + Math.abs(m - prev[i]), 0)   // chaque voix bouge le moins possible
        : Math.abs(mean(c) - mean(prev)) * c.length;
    }
    if (cost < bestCost) [best, bestCost] = [c, cost];
  }
  return best ?? padVoicing(chord);
}

// ---------- Rythme ----------
// Style d'accompagnement d'après le rythme de batterie.
const FAMILY = {
  walking: 'swing', brushes: 'swing', shuffle: 'swing', two: 'two', bossa: 'bossa',
  eighths: 'straight', disco: 'disco', funk: 'funk', reggae: 'reggae', halftime: 'halftime',
  waltz: 'swing',
};
const isSwing = (style) => ['swing', 'two'].includes(FAMILY[style]);

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Coups d'une mesure : [{ t (temps dans la mesure), dur (en temps), vel, push }].
// push : coup anticipé sur l'accord de la mesure suivante (qui ne rejoue pas alors sur son 1).
// pushed : la mesure précédente a anticipé celle-ci. meter : '4/4', '3/4', '6/8' ou '12/8'.
export function compBar(style, bar, bpb, { guitar = false, pushed = false, meter = null } = {}) {
  const family = FAMILY[style] ?? 'straight';
  const E = isSwing(style) ? 2 / 3 : 0.5;   // croche swing (comme la batterie) ou droite
  let hits;
  if (meter === '12/8') {
    // Blues lent : triolets de croches au piano, appuyés sur chaque temps ; parfois des accords tenus.
    hits = Math.random() < 0.7
      ? Array.from({ length: 12 }, (_, i) => [i / 2, 0.4, i % 3 === 0 ? 0.55 : 0.4])
      : [[0, 1.4, 0.55], [1.5, 0.4, 0.45], [3, 1.4, 0.55], [4.5, 0.4, 0.45], [5, 0.4, 0.4], [5.5, 0.4, 0.4]];
  } else if (meter === '6/8') {
    hits = pick([
      [[0, 1.4, 0.55], [1.5, 1.4, 0.5]],
      [[0, 0.4, 0.55], [1, 0.4, 0.45], [1.5, 0.4, 0.5], [2.5, 0.4, 0.45]],
      [[0.5, 0.4, 0.5], [1, 0.4, 0.45], [2, 0.4, 0.5], [2.5, 0.4, 0.45]],
    ]);
  } else if (meter === '3/4' && family === 'swing' && !guitar) {
    // Valse jazz : accords sur 2 et 3, parfois anticipés ou tenus.
    hits = pick([
      [[1, 0.6, 0.55], [2, 0.6, 0.5]],
      [[0, 1.4, 0.55], [2, 0.6, 0.5]],
      [[1 + E, 0.5, 0.5], [2, 0.8, 0.5]],
    ]);
  } else if (bpb !== 4) {
    // Mesures à 3 temps (ou autres) : basse sur le 1, accords sur les temps suivants.
    hits = Array.from({ length: bpb - 1 }, (_, i) => [i + 1, 0.5, 0.5]);
  } else if (family === 'swing' && guitar) {
    // Guitare « à la Freddie Green » : les 4 temps, courts, un peu plus appuyés sur 2 et 4.
    hits = [[0, 0.45, 0.5], [1, 0.45, 0.6], [2, 0.45, 0.5], [3, 0.45, 0.6]];
  } else if (family === 'swing') {
    hits = pick([
      [[0, 0.7, 0.6], [1 + E, 0.5, 0.5]],          // Charleston
      [[0, 0.7, 0.6], [2 + E, 0.5, 0.5]],
      [[1 + E, 0.6, 0.55], [3, 0.6, 0.5]],
      [[0, 1.5, 0.55]],
      [[1, 0.6, 0.5], [2 + E, 0.5, 0.5]],
      [[E, 0.5, 0.5], [2, 0.7, 0.55]],
    ]);
    if (Math.random() < 0.3) hits = [...hits.filter(([t]) => t < 3), [3 + E, 0.9, 0.6, true]];
  } else if (family === 'two') {
    hits = Math.random() < 0.25 ? [[0, 1.6, 0.55], [2, 1, 0.5], [3 + E, 0.9, 0.55, true]] : [[0, 1.6, 0.55], [2, 1.6, 0.5]];
  } else if (family === 'bossa') {
    // Motif de guitare bossa sur deux mesures.
    hits = bar % 2 === 0 ? [[0, 0.4, 0.55], [1.5, 0.4, 0.5], [3, 0.4, 0.5]] : [[1, 0.4, 0.5], [2.5, 0.4, 0.5]];
  } else if (family === 'disco') {
    hits = [0.5, 1.5, 2.5, 3.5].map((t) => [t, 0.3, 0.5]);
  } else if (family === 'funk') {
    hits = pick([
      [[0, 0.2, 0.65], [0.75, 0.2, 0.5], [2.5, 0.2, 0.55]],
      [[0, 0.2, 0.65], [1.5, 0.2, 0.5], [2.75, 0.2, 0.5], [3.5, 0.2, 0.45]],
      [[0.5, 0.2, 0.55], [1.75, 0.2, 0.5], [3, 0.2, 0.55]],
    ]);
  } else if (family === 'reggae') {
    hits = [[1, 0.35, 0.55], [3, 0.35, 0.55]];   // le « skank » sur 2 et 4
  } else if (family === 'halftime') {
    hits = pick([[[0, 2.5, 0.55]], [[0, 1.5, 0.55], [2.5, 0.8, 0.5]]]);
  } else {
    hits = Math.random() < 0.5 ? [[0, 1.8, 0.6], [2, 1.8, 0.55]] : [[0, 1, 0.6], [1.5, 0.4, 0.5], [2, 1.8, 0.55]];
    if (Math.random() < 0.25) hits = [...hits.filter(([t]) => t < 3), [3.5, 0.8, 0.55, true]];
  }
  return hits
    .filter(([t]) => !(pushed && t < 0.01))
    .map(([t, dur, vel, push = false]) => ({ t, dur, vel: vel * (0.9 + Math.random() * 0.2), push }));
}
