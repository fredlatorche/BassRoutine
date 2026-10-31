// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Mode « Déliateur » : exercices d'indépendance et d'agilité de la main gauche.
// Un doigt par case : le doigt f joue la case base + f − 1 (sauf écarts).
// Les cordes vont de 0 (Mi grave) à 3 (Sol) ; la tab les veut à l'envers (0 = Sol).
// Du plus facile au plus dur : chaque série part du milieu du manche sur la corde de Sol, descend
// les cordes vers le Mi, puis la main recule vers la tête du manche, où les cases sont plus larges.
import { pitchName } from './spelling.js';
import { noteLabel } from './notation.js';

const OPEN = [28, 33, 38, 43];   // Mi1, La1, Ré2, Sol2
const NAMES = ['Mi', 'La', 'Ré', 'Sol'];

const PERMS = [];
(function permute(rest, cur) {
  if (!rest.length) { PERMS.push(cur.join('')); return; }
  rest.forEach((d, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...cur, d]));
})([1, 2, 3, 4], []);

// Cordes voisines dans l'ordre de jeu (Sol → Ré, Ré → La…).
const pairsOf = (S) => S.slice(0, -1).map((s, i) => [s, S[i + 1]]);

// Pour chaque exercice :
// - steps(strings, variant) : une position de la main, liste de { s, f, fret? } (fret relatif à la
//   case de la position) ; strings est dans l'ordre de jeu, de l'aigu vers le grave
// - positions(start) : positions propres à l'exercice (sinon, la progression choisie)
// - shape : position de départ du schéma [corde, doigt, rôle, case?] ; held = reste posé, play = joue
// - hold : la règle d'or (en gras dans la popup), tips : conseils
export const EXERCISES = {
  chroma: {
    label: 'Chromatique 1-2-3-4',
    steps: (S) => S.flatMap((s) => [1, 2, 3, 4].map((f) => ({ s, f }))),
    shape: [[3, 1, 'held'], [3, 2, 'held'], [3, 3, 'held'], [3, 4, 'play']],
    hold: 'Chaque doigt reste posé après sa note : quand le 4 joue, les doigts 1, 2 et 3 sont encore sur la corde.',
    tips: [
      'On ne lève les quatre doigts qu\'au changement de corde.',
      'Le pouce reste derrière le manche, à peu près face au doigt 2.',
      'Appuie juste derrière la frette, pas au milieu de la case : moins de force, son plus net.',
    ],
  },
  reverse: {
    label: 'Inversé 4-3-2-1',
    steps: (S) => S.flatMap((s) => [4, 3, 2, 1].map((f) => ({ s, f }))),
    shape: [[3, 1, 'held'], [3, 2, 'held'], [3, 3, 'held'], [3, 4, 'play']],
    hold: 'Pose les quatre doigts avant de jouer, puis lève-les un par un : la note qui sonne est celle du doigt suivant, déjà en place.',
    tips: [
      'Lève le doigt juste assez pour libérer la corde (1 cm maximum).',
      'Attention à ne pas « tirer » la corde en levant le doigt : sinon elle sonne toute seule.',
      'C\'est le meilleur exercice pour réveiller l\'auriculaire.',
    ],
  },
  spider: {
    label: 'Araignée (diagonale)',
    steps: (S) => pairsOf(S).flatMap(([a, b]) => [
      { s: a, f: 1 }, { s: b, f: 3 }, { s: a, f: 2 }, { s: b, f: 4 },
    ]),
    shape: [[3, 1, 'held'], [2, 3, 'held'], [3, 2, 'play'], [2, 4, 'play']],
    hold: 'Les doigts marchent deux par deux : 1 et 3 posés ensemble en diagonale, puis 2 et 4. Deux doigts sont toujours sur le manche.',
    tips: [
      'Quand 2 et 4 se posent, 1 et 3 se lèvent en même temps, comme les pattes d\'une araignée.',
      'Les doigts levés restent au-dessus de leur case, prêts à revenir.',
      'Lent d\'abord : c\'est la coordination qui compte, pas la vitesse.',
    ],
  },
  perms: {
    label: 'Permutations',
    variants: Object.fromEntries(PERMS.map((p) => [p, p.split('').join('-')])),
    variant: '1324',
    steps: (S, v) => S.flatMap((s) => v.split('').map((f) => ({ s, f: Number(f) }))),
    hold: 'Un doigt par case, toujours : chaque doigt ne joue que « sa » case. Les doigts qui ne jouent pas restent au-dessus de leur case, à quelques millimètres.',
    tips: [
      'Les 24 ordres possibles des 4 doigts : change de permutation chaque jour.',
      'Les plus dures font se suivre 3 et 4 : 1-3-4-2, 2-4-3-1…',
      'Si un doigt s\'envole loin du manche, ralentis le tempo.',
    ],
  },
  pairs: {
    label: 'Doigts deux à deux',
    variants: { 12: '1 et 2', 13: '1 et 3', 14: '1 et 4', 23: '2 et 3', 24: '2 et 4', 34: '3 et 4' },
    variant: '34',
    steps: (S, v) => S.flatMap((s) => [0, 1, 0, 1, 0, 1, 0, 1].map((k) => ({ s, f: Number(v[k]) }))),
    hold: 'Seuls les deux doigts choisis bougent ; les deux autres restent immobiles au-dessus de leur case, sans se crisper.',
    tips: [
      'Le couple 3-4 est le plus difficile : l\'annulaire et l\'auriculaire partagent un tendon.',
      'Le doigt grave peut rester posé pendant que l\'aigu joue.',
      'Main détendue : si l\'avant-bras chauffe, fais une pause.',
    ],
  },
  anchor: {
    label: 'Doigt fixe (1 posé)',
    steps: (S) => S.flatMap((s) => [1, 2, 1, 3, 1, 4, 1, 3].map((f) => ({ s, f }))),
    shape: [[3, 1, 'held'], [3, 2, 'play'], [3, 3, 'play'], [3, 4, 'play']],
    hold: 'L\'index reste posé sur sa case pendant toute la corde, même quand les autres doigts jouent : il ne se lève jamais.',
    tips: [
      'Quand le doigt du dessus se lève, c\'est la note de l\'index qui sonne de nouveau.',
      'Travaille l\'indépendance du majeur, de l\'annulaire et de l\'auriculaire.',
      'L\'index pose légèrement : juste assez pour que la note sonne.',
    ],
  },
  cross: {
    label: 'Passage de corde un doigt à la fois',
    // Tour 0 : les 4 doigts sur la corde ; tour k : les k premiers doigts sur la corde suivante.
    steps: (S) => pairsOf(S).flatMap(([a, b], i) => [0, 1, 2, 3, 4].filter((m) => m || i === 0).flatMap((moved) =>
      [1, 2, 3, 4].map((f) => ({ s: f <= moved ? b : a, f })))),
    shape: [[2, 1, 'play'], [3, 2, 'held'], [3, 3, 'held'], [3, 4, 'held']],
    hold: 'Les quatre doigts sont posés. Un seul doigt à la fois passe sur la corde suivante (même case, une quarte plus bas) : les trois autres ne bougent pas.',
    tips: [
      'Tour 1 : seul l\'index change de corde. Tour 2 : l\'index et le majeur. Etc.',
      'Idéal pour les lignes qui changent souvent de corde à la même case.',
      'Garde les doigts arrondis, sur le bout, pour ne pas toucher la corde voisine.',
    ],
    noReturn: true,
  },
  stairs: {
    label: 'Escalier (une case de moins à chaque passage)',
    // Quatre passages, chacun une case plus près de la tête ; les cordes en aller puis en retour.
    positions: (start) => [0, 1, 2, 3].map((k) => Math.max(1, start - k)),
    steps: (S, v, k) => (k % 2 ? [...S].reverse() : S).flatMap((s) => [1, 2, 3, 4].map((f) => ({ s, f }))),
    shape: [[3, 1, 'held'], [3, 2, 'held'], [3, 3, 'held'], [3, 4, 'play']],
    hold: 'Comme le chromatique : chaque doigt reste posé jusqu\'au changement de corde. À chaque passage, toute la main recule d\'une case vers la tête du manche.',
    tips: [
      'Le pouce glisse avec la main : il reste face au doigt 2.',
      'Le déplacement se fait pendant la dernière note, sans couper le son.',
      'Sol → Mi, puis Mi → Sol une case plus bas, et ainsi de suite : les cases s\'élargissent peu à peu.',
    ],
    noReturn: true,
  },
  stretch: {
    label: 'Écarts (5 cases)',
    steps: (S) => S.flatMap((s) => [[1, 0], [2, 1], [3, 3], [4, 4]].map(([f, fret]) => ({ s, f, fret }))),
    shape: [[3, 1, 'held'], [3, 2, 'held'], [3, 3, 'held', 3], [3, 4, 'play', 4]],
    hold: 'Les doigts s\'écartent sur cinq cases (un trou entre le 2 et le 3) et restent posés comme dans le chromatique.',
    tips: [
      'En milieu de manche les cases sont étroites : c\'est là qu\'on commence, puis la série descend vers la tête.',
      'Le pouce descend un peu derrière le manche pour ouvrir la main.',
      'Jamais de douleur : au moindre tiraillement, on arrête et on secoue la main.',
    ],
  },
  roll: {
    label: 'Doigt couché sur deux cordes',
    steps: (S) => pairsOf(S).flatMap(([a, b]) => [1, 2, 3, 4].flatMap((f) => [{ s: a, f }, { s: b, f }])),
    shape: [[3, 1, 'held'], [2, 1, 'play']],
    hold: 'Le même doigt joue deux cordes de suite à la même case : couche-le à plat sur les deux cordes (ou roule-le de l\'une à l\'autre).',
    tips: [
      'La première note doit s\'arrêter quand la deuxième sonne : étouffe-la en relâchant la pression ou avec la main droite.',
      'On retrouve ce geste dans les quintes, les octaves et les lignes funk.',
      'L\'auriculaire couché est le plus dur : vas-y doucement.',
    ],
  },
  trills: {
    label: 'Trilles (liés)',
    steps: (S) => S.flatMap((s) => [1, 2, 1, 2, 2, 3, 2, 3, 3, 4, 3, 4].map((f) => ({ s, f }))),
    shape: [[3, 1, 'held'], [3, 2, 'play']],
    hold: 'Ne pince la corde qu\'une fois par groupe : le doigt du dessus frappe la corde (hammer-on) puis l\'arrache (pull-off). Le doigt du dessous reste posé.',
    tips: [
      'Le doigt qui frappe tombe du bout, comme un petit marteau, juste derrière la frette.',
      'Pour le pull-off, tire légèrement la corde vers le bas en levant le doigt : elle doit sonner fort.',
      'Écoute que les deux notes aient le même volume.',
    ],
    noReturn: true,
  },
  shift: {
    label: 'Démanché sur une corde',
    // Sur la première corde jouée, la main recule de 3 cases à chaque fois, jusqu'à la case 1.
    positions: (start) => downTo1(start, 3),
    steps: (S) => [1, 2, 3, 4].map((f) => ({ s: S[0], f })),
    shape: [[3, 1, 'held'], [3, 2, 'held'], [3, 3, 'held'], [3, 4, 'play']],
    hold: 'Les doigts restent posés comme dans le chromatique ; après le 4, toute la main recule vers la tête pour que l\'index tombe pile sur sa nouvelle case.',
    tips: [
      'Regarde la case d\'arrivée avant de partir.',
      'La main glisse sans quitter la corde, le pouce l\'accompagne.',
      'Se joue sur la première corde choisie (Sol avec les 4 cordes).',
    ],
  },
};

// Variantes : le schéma montre les doigts de la variante choisie.
function shapeOf(exercise, v) {
  if (exercise === 'perms') return [1, 2, 3, 4].map((f) => [3, f, Number(v[0]) === f ? 'play' : 'ready']);
  if (exercise === 'pairs') return [1, 2, 3, 4].map((f) => [3, f, v.includes(String(f)) ? 'play' : 'ready']);
  return EXERCISES[exercise].shape;
}

// Libellé (texte) ou paire de cordes, à nommer dans la notation choisie.
export const STRING_SETS = {
  all: 'Les 4 cordes',
  high: ['Sol', 'Ré'],
  mid: ['Ré', 'La'],
  low: ['La', 'Mi'],
};
const STRINGS = { all: [3, 2, 1, 0], high: [3, 2], mid: [2, 1], low: [1, 0] };   // ordre de jeu

// Progression des positions de la main, de la case de départ vers la tête du manche.
export const PROGRESSIONS = {
  two: 'Recule de 2 en 2',
  one: 'Recule case par case',
  stay: 'Sur place',
};
function downTo1(start, step) {
  const out = [];
  for (let p = start; p > 1; p -= step) out.push(p);
  return [...out, 1];
}
const positionsOf = (start, progression) =>
  progression === 'stay' ? [start] : downTo1(start, progression === 'one' ? 1 : 2);

// Construit l'exercice : mêmes champs que les gammes (événements, mesures, légendes, résumé).
// rhythm = notes par temps ; direction 'down' (Sol → Mi) ou 'both' (aller-retour à chaque position).
export function buildFingerExercise({ exercise, variant, fret, strings, direction, rhythm, progression }, bpb = 4) {
  const ex = EXERCISES[exercise] ?? EXERCISES.chroma;
  const v = ex.variants ? (ex.variants[variant] ? variant : ex.variant) : null;
  const S = STRINGS[strings] ?? STRINGS.all;
  const start = Math.min(12, Math.max(1, Number(fret)));
  const positions = ex.positions ? ex.positions(start) : positionsOf(start, progression);

  const steps = [];
  positions.forEach((p, k) => {
    let seq = ex.steps(S, v, k);
    if (direction === 'both' && !ex.noReturn) seq = [...seq, ...[...seq].reverse().slice(1)];
    // D'une position à l'autre, on ne rejoue pas la même note deux fois de suite.
    seq.forEach((x, i) => {
      const fr = p + (x.fret ?? x.f - 1);
      const prev = steps[steps.length - 1];
      if (i === 0 && prev && prev.s === x.s && prev.fr === fr) return;
      steps.push({ ...x, fr });
    });
  });

  const dt = 1 / rhythm;
  const events = steps.map((x, i) => {
    const midi = OPEN[x.s] + x.fr;
    const t = i * dt;
    const last = i === steps.length - 1;
    const end = last ? Math.ceil((t + 1) / bpb) * bpb - 0.1 : t + dt * 0.9;
    return { t, dur: end - t, midi, name: pitchName(midi, 0), sig: 0, vel: 0.8, string: 3 - x.s, fret: x.fr, finger: x.f };
  });
  const bars = Math.ceil(((steps.length - 1) * dt + 1) / bpb);
  const title = `${ex.label}${v ? ` ${ex.variants[v]}` : ''}`;
  const where = positions.length > 1 ? `cases ${positions[0]} → ${positions[positions.length - 1]}` : `case ${positions[0]}`;
  const labels = Array.from({ length: bars }, (_, b) => `${title} · ${where} · Mesure ${b + 1}/${bars}`);
  const keys = [{ label: `${title} · ${where}`, startBar: 0, bars, names: events.map((e) => e.name) }];
  return { events, labels, keys, bars, title };
}

// ---------- Popup explicative ----------

const TIP_KEY = 'bassroutine-fingers-tips';   // '0' : ne plus afficher à la sélection
export const tipsWanted = () => {
  try { return localStorage.getItem(TIP_KEY) !== '0'; } catch { return true; }
};

// Schéma du manche : 4 cordes, 5 cases ; points numérotés (plein = posé, anneau = joue, pointillé = prêt).
function shapeSvg(shape, base) {
  const W = 300, H = 136, X0 = 34, FW = 44, Y0 = 18, SH = 28;
  const fretX = (k) => X0 + k * FW;
  const y = (s) => Y0 + (3 - s) * SH;   // Sol en haut, comme la tab
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="finger-shape" role="img" aria-label="Position de la main">`;
  for (let k = 0; k <= 5; k++) svg += `<line x1="${fretX(k)}" y1="${Y0 - 6}" x2="${fretX(k)}" y2="${y(0) + 6}" class="fs-fret"/>`;
  for (let s = 0; s < 4; s++) {
    svg += `<line x1="${X0 - 6}" y1="${y(s)}" x2="${fretX(5) + 6}" y2="${y(s)}" class="fs-string" style="stroke-width:${1 + (3 - s) * 0.5}"/>`;
    svg += `<text x="${X0 - 12}" y="${y(s) + 4}" class="fs-name" text-anchor="end">${noteLabel(NAMES[s])}</text>`;
  }
  for (let k = 0; k < 5; k++) svg += `<text x="${fretX(k) + FW / 2}" y="${y(0) + 30}" class="fs-num" text-anchor="middle">${base + k}</text>`;
  for (const [s, f, how, fret] of shape) {
    const cx = fretX(fret ?? f - 1) + FW / 2, cy = y(s);
    svg += `<circle cx="${cx}" cy="${cy}" r="11" class="fs-dot ${how}"/><text x="${cx}" y="${cy + 4.5}" class="fs-finger ${how}" text-anchor="middle">${f}</text>`;
  }
  return `${svg}</svg>`;
}

const escape = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function showFingerTip(exercise, { base = 7, variant } = {}) {
  document.querySelector('.finger-tip')?.remove();
  const ex = EXERCISES[exercise] ?? EXERCISES.chroma;
  const v = ex.variants ? (ex.variants[variant] ? variant : ex.variant) : null;
  const box = document.createElement('div');
  box.className = 'finger-tip';
  box.innerHTML = `
    <div class="finger-card" role="dialog" aria-modal="true" aria-labelledby="fingerTipTitle" tabindex="-1">
      <h2 id="fingerTipTitle">🖐 ${escape(ex.label)}${v ? ` <span>${escape(ex.variants[v])}</span>` : ''}</h2>
      ${shapeSvg(shapeOf(exercise in EXERCISES ? exercise : 'chroma', v), base)}
      <p class="fs-legend"><span class="fs-key held"></span> reste posé <span class="fs-key play"></span> joue <span class="fs-key ready"></span> prêt, au-dessus de sa case</p>
      <p class="finger-hold">${escape(ex.hold)}</p>
      <p class="finger-slow">🐢 Travaille lentement : chaque note propre et bien posée, sans crispation. On n'accélère (de 5 en 5) que quand tout est net, plusieurs fois de suite.</p>
      <ul>${ex.tips.map((t) => `<li>${escape(t)}</li>`).join('')}</ul>
      <p class="finger-num">Du plus facile au plus dur : on commence en milieu de manche sur la corde de Sol, puis la main recule vers la tête, où les cases sont plus larges. Le petit chiffre au-dessus de chaque note de la tab est le doigt à utiliser (1 index … 4 auriculaire).</p>
      <div class="finger-actions">
        <label class="toggle"><input type="checkbox" class="finger-never"${tipsWanted() ? '' : ' checked'}> Ne plus afficher à la sélection</label>
        <button class="finger-ok primary">C'est parti</button>
      </div>
    </div>`;
  const close = () => {
    try { localStorage.setItem(TIP_KEY, box.querySelector('.finger-never').checked ? '0' : '1'); } catch { /* stockage indisponible */ }
    box.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  box.querySelector('.finger-ok').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(box);
  box.querySelector('.finger-card').focus({ preventScroll: true });
}
