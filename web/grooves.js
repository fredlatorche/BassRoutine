// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Boucles toutes prêtes : grilles de standards de jazz, airs traditionnels et grooves de styles.
// Les grilles d'accords et les airs du domaine public sont repris ; les lignes de basse sont écrites ici.
// Même format que les lignes du mode Boucle : une note par temps (noire, ou noire pointée en 6/8 et
// 12/8), une mesure = une liste de `beats` notes ; bar(accord, suivant, n° de mesure) ou lines.
// meter et bars : mesure et longueur imposées quand on choisit la boucle.
import { parseChord, bassRoot, LOW_E } from './theory.js';

const root = (c) => bassRoot(parseChord(c));
const tones = (c) => parseChord(c).tones;
// Note de passage chromatique vers la fondamentale de l'accord suivant (par en dessous si possible).
const approach = (next) => (root(next) - 1 >= LOW_E ? root(next) - 1 : root(next) + 1);

// Walking : arpège montant, puis note de passage vers l'accord suivant.
function walk(c, next, b) {
  const r = root(c), t = tones(c);
  return b % 2 ? [r, r + t[2], r + (t[3] ?? 12), approach(next)] : [r, r + t[1], r + t[2], approach(next)];
}
// 1-3-5-6 en montant, puis ♭7-6-5-3 en redescendant (boogie, blues).
const boogie = (c, next, b) => {
  const r = root(c);
  return b % 2 ? [r + 10, r + 9, r + 7, r + 4] : [r, r + 4, r + 7, r + 9];
};

export const GROOVES = {
  // ---------- Jazz ----------
  // Blues mineur de 12 mesures (grille de Mr. P.C., John Coltrane) en Do mineur, walking.
  minorBlues: {
    fifths: -3,
    bars: 24,
    chords: ['Cm7', 'Cm7', 'Cm7', 'Cm7', 'Fm7', 'Fm7', 'Cm7', 'Cm7', 'Ab7', 'G7', 'Cm7', 'G7'],
    lines: [
      [36, 39, 43, 46], [48, 43, 39, 37], [36, 39, 41, 43], [46, 43, 41, 40],
      [41, 44, 48, 44], [41, 39, 38, 37], [36, 43, 39, 43], [36, 34, 33, 31],
      [32, 36, 39, 30], [31, 35, 38, 37], [36, 39, 43, 32], [31, 35, 38, 35],
    ],
    drums: 'walking',
  },
  // Blue Bossa (Kenny Dorham) : Do mineur puis Ré♭ majeur, en bossa (fondamentale, quinte).
  blueBossa: {
    fifths: -3,
    bars: 16,
    chords: ['Cm7', 'Cm7', 'Fm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Cm7',
      'Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7', 'Dm7b5', 'G7', 'Cm7', 'G7'],
    bar: (c) => {
      const r = root(c), fifth = r + tones(c)[2] - 12 >= LOW_E ? r + tones(c)[2] - 12 : r + tones(c)[2];
      return [r, null, fifth, fifth];
    },
    drums: 'bossa',
  },
  // Cantaloupe Island (Herbie Hancock) : quatre mesures par accord, groove binaire.
  cantaloupe: {
    fifths: -4,
    bars: 16,
    chords: ['Fm7', 'Fm7', 'Fm7', 'Fm7', 'Db7', 'Db7', 'Db7', 'Db7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Fm7', 'Fm7', 'Fm7', 'Fm7'],
    bar: (c, next, b) => {
      const r = root(c), t = tones(c);
      return b % 2 ? [r + 12, r + t[3], r + t[2], r + t[1]] : [r, null, r + t[2], r + t[3]];
    },
    drums: 'funk',
  },
  // All Blues (Miles Davis) : blues en Sol en 6/8, fondamentale et quinte sur chaque temps.
  allBlues: {
    fifths: 0,
    meter: '6/8',
    bars: 24,
    chords: ['G7', 'G7', 'G7', 'G7', 'Gm7', 'Gm7', 'G7', 'G7', 'D7', 'Eb7', 'D7', 'G7'],
    bar: (c, next, b) => {
      const r = root(c);
      return b % 2 ? [r + 7, r + 10] : [r, r + 7];
    },
  },
  // ---------- Blues ----------
  // Blues lent en La, en 12/8 (quatre noires pointées par mesure), à la manière des slow blues.
  slowBlues: {
    fifths: 3,
    meter: '12/8',
    bars: 24,
    chords: ['A7', 'D7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'],
    bar: (c, next, b) => {
      const r = root(c);
      return b % 2 ? [r + 12, r + 10, r + 7, approach(next)] : [r, r + 4, r + 7, r + 9];
    },
  },
  // Boogie shuffle en Mi : la ligne 1-3-5-6-♭7 de tous les blues rock.
  boogie: {
    fifths: 4,
    bars: 24,
    chords: ['E7', 'E7', 'E7', 'E7', 'A7', 'A7', 'E7', 'E7', 'B7', 'A7', 'E7', 'B7'],
    bar: boogie,
    drums: 'shuffle',
  },
  // ---------- Pop, rock, folk ----------
  // Canon de Pachelbel : la basse obstinée (Ré La Si Fa# Sol Ré Sol La), une mesure par accord.
  pachelbel: {
    fifths: 2,
    bars: 16,
    chords: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'],
    lines: [
      [38, 45, 50, 45], [33, 40, 45, 40], [35, 42, 47, 42], [30, 37, 42, 37],
      [31, 38, 43, 38], [38, 45, 50, 45], [31, 38, 43, 38], [33, 40, 45, 37],
    ],
    drums: 'halftime',
  },
  // La Maison du soleil levant (air traditionnel américain) en 6/8, La mineur.
  risingSun: {
    fifths: 0,
    meter: '6/8',
    bars: 16,
    chords: ['Am', 'C', 'D', 'F', 'Am', 'C', 'E', 'E', 'Am', 'C', 'D', 'F', 'Am', 'E', 'Am', 'E'],
    bar: (c) => {
      const r = root(c);
      return [r, r + 7];
    },
  },
  // Greensleeves (air anglais du XVIe siècle) en 3/4, La mineur : couplet et refrain.
  greensleeves: {
    fifths: 0,
    meter: '3/4',
    bars: 32,
    chords: [
      'Am', 'C', 'G', 'Em', 'Am', 'F', 'E', 'E', 'Am', 'C', 'G', 'Em', 'Am', 'E', 'Am', 'Am',
      'C', 'C', 'G', 'Em', 'Am', 'F', 'E', 'E', 'C', 'C', 'G', 'Em', 'Am', 'E', 'Am', 'Am',
    ],
    bar: (c, next, b) => {
      const r = root(c), t = tones(c);
      return b % 2 ? [r, r + t[1], r + t[2]] : [r, r + t[2], r + 12];
    },
  },
  // Doo-wop des années 50 (Do La m Fa Sol), en 12/8 : 1-3-5-6 sur chaque accord.
  doowop: {
    fifths: 0,
    meter: '12/8',
    bars: 16,
    chords: ['C', 'Am', 'F', 'G'],
    bar: (c) => {
      const r = root(c), t = tones(c);
      return [r, r + t[1], r + t[2], r + (t[1] === 3 ? 8 : 9)];
    },
  },
  // Funk en Mi sur un seul accord : octaves, ♭7 et petite descente bluesy toutes les 4 mesures.
  funk: {
    fifths: 4,
    bars: 16,
    chords: ['E7'],
    lines: [[28, 40, 38, 35], [28, null, 31, 33], [28, 40, 38, 35], [40, 38, 35, 34]],
    drums: 'funk',
  },
  // Reggae one drop en Sol (Sol Mi m Do Ré) : la basse respire, silence sur le 2e temps.
  reggae: {
    fifths: 1,
    bars: 16,
    chords: ['G', 'Em', 'C', 'D'],
    bar: (c) => {
      const r = root(c), t = tones(c);
      return [r, null, r + t[1], r + t[2]];
    },
    drums: 'reggae',
  },
};
