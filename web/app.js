// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Bass Routine : mode Boucle (grille éditable) et mode Morceau (walking générée ou MIDI importé),
// avec accords de synthé, métronome et tablature qui défile.

import { LOW_E, parseChord, bassRoot } from './theory.js';
import { GROOVES } from './grooves.js';
import { HELD_SOUNDS, voiceLead, compBar } from './comping.js';
import { SONGS, expandSong } from './songs.js';
import { bassLine, STYLES } from './walking.js';
import { readMidiFile, guessBassTrack } from './midi-import.js';
import * as library from './library.js';
import { createTab } from './tab.js';
import { createKit, patternHits, gmDrumEvents, DRUM_STYLES, WALKING_DRUMS, METER_DRUMS } from './drums.js';
import { SCALE_TYPES, FINGERINGS, ZONES, keyOptions, boxOptions, buildScaleExercise } from './scales.js';
import { EXERCISES, STRING_SETS, PROGRESSIONS, buildFingerExercise, showFingerTip, tipsWanted } from './fingers.js';
import { inventLoop, KEY_CHOICES, fifthsFromLabel } from './random-loop.js';
import { spellEvents, pitchName } from './spelling.js';
import { setNotation, getNotation, noteLabel } from './notation.js';
import * as midiOut from './midi-out.js';
import * as pitch from './pitch.js';
import { createTuner } from './tuner.js';
import { createRecorder } from './recorder.js';
import * as game from './game.js';

const BEATS = 4;
// Mesures du mode Boucle : temps par mesure (une note de la grille par temps) et durée d'un temps
// en noires (1,5 en 6/8 et 12/8 : noire pointée, divisée en trois croches).
const METERS = {
  '4/4': { beats: 4, pulse: 1 },
  '3/4': { beats: 3, pulse: 1 },
  '6/8': { beats: 2, pulse: 1.5 },
  '12/8': { beats: 4, pulse: 1.5 },
};
const meterOf = (state = loopState) => METERS[state.meter] ?? METERS['4/4'];
// Mesure toute prête ramenée au nombre de temps de la mesure (une ligne trop courte est répétée).
const fitBar = (notes, beats) => (beats === 2 && notes.length > 2 ? [notes[0], notes[2]]
  : Array.from({ length: beats }, (_, i) => notes[i % notes.length]));
const $ = (id) => document.getElementById(id);

// Notes proposées dans la grille, du Mi grave au Do de la case 17 sur G ;
// l'octave du dessus est marquée « aigu », la suivante « suraigu ».
const GRID_HIGH = 60;
const BASS_NOTES = [];
for (let m = LOW_E; m <= GRID_HIGH; m++) BASS_NOTES.push(m);
// Nom dans la tonalité de la boucle (Mi♭ plutôt que Ré♯ en Si♭…).
const gridLabel = (m) => noteLabel(pitchName(m, loopState.fifths)) + (m >= LOW_E + 24 ? ' suraigu' : m >= LOW_E + 12 ? ' aigu' : '');

const LOOP_CHORDS = ['Em', 'E', 'E7', 'Am', 'Am7', 'A', 'A7', 'D', 'D7', 'Dm7', 'G', 'Gmaj7', 'Gm7', 'C', 'Bm', 'B7'];

const PRESETS = {
  // fifths : armure de la ligne (dièses > 0, bémols < 0), pour l'écriture sur la portée.
  mi: {
    fifths: 1,
    chords: ['Em'],
    bar: () => [LOW_E, LOW_E, LOW_E, LOW_E],
  },
  quinte: {
    fifths: 1,
    chords: ['Em', 'Am', 'B7', 'Em'],
    bar: (c) => { const r = bassRoot(parseChord(c)); return [r, r + 7, r, r + 7]; },
  },
  walking: {
    fifths: 1,
    chords: ['Em', 'Am', 'D', 'G'],
    bar: (c, next) => {
      const r = bassRoot(parseChord(c));
      const third = parseChord(c).minor ? 3 : 4;
      const target = bassRoot(parseChord(next));
      const approach = target - 1 >= LOW_E ? target - 1 : target + 1;
      return [r, r + third, r + 7, approach];
    },
  },
  // Lignes écrites note par note (une mesure = 4 noires), répétées pour remplir la boucle.
  // Blues en Mi : 1-3-5-6 et descentes chromatiques vers chaque accord.
  walkingBlues: {
    fifths: 4,
    chords: ['E7', 'E7', 'A7', 'A7', 'E7', 'E7', 'B7', 'A7'],
    lines: [
      [28, 32, 35, 37], [38, 37, 35, 32], [33, 37, 40, 37], [33, 31, 30, 29],
      [28, 32, 35, 37], [38, 37, 35, 34], [35, 39, 42, 34], [33, 31, 30, 29],
    ],
    drums: 'walking',
  },
  // ii-V-I en Sol avec retour par Mi7 : chaque mesure finit un demi-ton au-dessus de l'accord suivant.
  walking251: {
    fifths: 1,
    chords: ['Am7', 'D7', 'Gmaj7', 'E7'],
    lines: [[33, 36, 40, 39], [38, 42, 45, 44], [43, 47, 45, 41], [40, 38, 35, 34]],
    drums: 'walking',
  },
  // Haut du manche en Ré mineur, lié et chantant, pensé pour la fretless :
  // cordes de D et G entre les cases 10 et 15 (positions imposées dans la tab).
  walkingHigh: {
    fifths: -1,
    chords: ['Dm7', 'Gm7', 'A7', 'Dm7'],
    lines: [[50, 52, 53, 57], [58, 57, 55, 53], [52, 49, 52, 55], [53, 52, 50, 49]],
    // [corde, case] avec 0 = G, 1 = D
    frets: [
      [[1, 12], [1, 14], [0, 10], [0, 14]], [[0, 15], [0, 14], [0, 12], [0, 10]],
      [[1, 14], [1, 11], [1, 14], [0, 12]], [[0, 10], [1, 14], [1, 12], [1, 11]],
    ],
    legato: true,
    drums: 'walking',
  },
  ...GROOVES,   // standards de jazz, airs traditionnels, grooves (grooves.js)
};

let mode = 'loop';

const loopState = {
  bars: 8,
  meter: '4/4',
  chords: [],
  bass: [],   // une note MIDI (ou null = silence) par temps
  frets: [],  // position imposée dans la tab ([corde, case]) ou null, par temps
  legato: false,
  drums: 'eighths',
  fifths: 1,   // armure de la boucle
};

const songState = {
  songId: SONGS[0].id,
  choruses: 2,
  seed: 1,
  style: 'walking',
  midi: null,     // fichier importé (readMidiFile)
  track: 0,
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  inventedLabel = '';
  loopState.chords = [];
  loopState.bass = [];
  loopState.frets = [];
  loopState.legato = !!p.legato;
  loopState.fifths = p.fifths ?? 0;
  loopState.drums = METER_DRUMS[loopState.meter] ?? p.drums ?? 'eighths';
  const { beats } = meterOf();
  for (let b = 0; b < loopState.bars; b++) {
    const chord = p.chords[b % p.chords.length];
    const next = p.chords[(b + 1) % p.chords.length];
    loopState.chords.push(chord);
    loopState.bass.push(...fitBar(p.lines ? p.lines[b % p.lines.length] : p.bar(chord, next, b), beats));
    loopState.frets.push(...fitBar(p.frets ? p.frets[b % p.frets.length] : [null, null, null, null], beats));
  }
  renderLoopGrid();
}

// Mode aléatoire : grille et walking inventées dans la tonalité choisie (ou au hasard).
function improvise(drums) {
  const register = $('randRegister').value;
  const r = inventLoop({ key: $('randKey').value, mode: $('randMode').value, register, bars: loopState.bars, beats: meterOf().beats });
  return {
    label: r.label,
    bars: loopState.bars,
    state: { chords: r.chords, bass: r.line, frets: r.line.map(() => null), legato: register === 'high', drums, fifths: r.fifths },
  };
}

// Improvisations (ou gammes) enchaînées : la suivante est préparée d'avance pour l'afficher dans la tab
// après celle qui joue, et la précédente reste affichée avant (défilement continu, comme en boucle).
let upcoming = null;    // improvisation suivante
let chainPrev = null;   // partie précédente : { events, beats }

// next : improvisation enchaînée en fin de boucle (celle qui était prévue, même batterie, cases
// laissées comme elles sont) ; l'affichage est mis à jour par showChain().
function invent({ next = false } = {}) {
  // Batterie en « Auto » : un rythme au hasard parmi ceux qui vont avec une walking.
  const drums = next ? loopState.drums
    : METER_DRUMS[loopState.meter] ?? WALKING_DRUMS[Math.floor(Math.random() * WALKING_DRUMS.length)];
  const imp = next && upcoming?.bars === loopState.bars ? upcoming : improvise(drums);
  upcoming = null;
  Object.assign(loopState, imp.state);
  $('preset').value = 'invented';
  const drumLabel = DRUM_STYLES[$('drumStyle').value === 'auto' ? drums : $('drumStyle').value];
  inventedLabel = `🎲 ${imp.label}  ·  batterie : ${drumLabel}`;
  // C'est avec la nappe et la batterie que ça sonne : on les active.
  if (!next) {
    $('synth').checked = true;
    $('drums').checked = true;
  }
  if (next) return;
  chainPrev = null;
  renderLoopGrid();
}

// Change le nombre de mesures en répétant le contenu existant.
function setBars(n) {
  chainPrev = null;
  const oldBars = loopState.bars;
  const chords = [], bass = [], frets = [];
  for (let b = 0; b < n; b++) {
    const src = b % oldBars;
    chords.push(loopState.chords[src]);
    const { beats } = meterOf();
    bass.push(...loopState.bass.slice(src * beats, src * beats + beats));
    frets.push(...loopState.frets.slice(src * beats, src * beats + beats));
  }
  Object.assign(loopState, { bars: n, chords, bass, frets });
  renderLoopGrid();
}

// ---------- Programme : ce que le lecteur joue ----------

let prog = null;

function byBeat(events, totalBeats) {
  const out = Array.from({ length: Math.ceil(totalBeats) }, () => []);
  for (const e of events) out[Math.floor(e.t)]?.push(e);
  return out;
}

// Le synthé de basse est monophonique : une note ne doit pas déborder sur la suivante.
function trimLegato(events) {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  return sorted.map((e, i) => {
    const next = sorted[i + 1];
    if (!next || e.t + e.dur <= next.t - 0.02) return e;
    return { ...e, dur: Math.max(0.05, next.t - e.t - 0.02) };
  });
}

// chordBars : un tableau de symboles par mesure (ou null) ; labels : texte affiché par mesure.
// drumStyle : rythme de batterie généré ; drums : coups lus dans un MIDI (remplacent le rythme).
// fifths : armure (pour la portée) ; les notes peuvent porter leur propre armure (sig, gammes).
// meter, pulse : mesure du mode Boucle et durée d'un temps en noires (tempo, métronome, batterie, portée).
function makeProgram({ events, others = [], drums = null, drumStyle = 'eighths', chordBars = null, bars, bpb, labels, fifths = 0, meter = null, pulse = 1 }) {
  const totalBeats = bars * bpb;
  const bassEvents = trimLegato(events);
  // Armure de chaque mesure (change d'une tonalité à l'autre dans les gammes).
  const barSig = [];
  let sig = bassEvents[0]?.sig ?? fifths;
  for (let b = 0; b < bars; b++) {
    const first = bassEvents.find((e) => e.t >= b * bpb && e.t < (b + 1) * bpb);
    if (first?.sig != null) sig = first.sig;
    barSig.push(sig);
  }
  const chordStarts = [];
  chordBars?.forEach((chords, b) => {
    const len = bpb / chords.length;
    chords.forEach((symbol, i) => { chordStarts[b * bpb + i * len] = { symbol, beats: len }; });
  });
  // Accord qui sonne à chaque temps, avec le temps où il a commencé.
  const chordAt = [];
  for (let t = 0, cur = null; t < totalBeats; t++) {
    if (chordStarts[t]) cur = { symbol: chordStarts[t].symbol, start: t };
    chordAt[t] = cur;
  }
  return {
    totalBeats,
    bpb,
    meter,
    pulse,
    labels,
    bassEvents,
    bassByBeat: byBeat(bassEvents, totalBeats),
    otherByBeat: byBeat(others, totalBeats),
    drumByBeat: drums?.length ? byBeat(drums, totalBeats) : null,
    drumStyle,
    chordStarts,
    chordAt,
    barSig,
  };
}

function buildLoopProgram(state = loopState) {
  const { beats, pulse } = meterOf(state);
  const bpb = beats * pulse;   // noires par mesure
  const events = [];
  state.bass.forEach((midi, i) => {
    if (midi == null) return;
    const pos = state.frets[i];
    events.push({
      t: i * pulse, dur: pulse * (state.legato ? 0.97 : 0.85), midi, vel: i % beats === 0 ? 0.9 : 0.75,
      ...(pos && { string: pos[0], fret: pos[1] }),
    });
  });
  return makeProgram({
    events: spellEvents(events, (t) => state.chords[Math.floor(t / bpb)], state.fifths),
    fifths: state.fifths,
    drumStyle: state.drums,
    chordBars: state.chords.map((c) => [c]),
    bars: state.bars,
    bpb,
    meter: state.meter ?? '4/4',
    pulse,
    labels: state.chords.map((_, b) => `Mesure ${b + 1}`),
  });
}

const currentSong = () => SONGS.find((s) => s.id === songState.songId);
// Morceau MIDI : songId = « midi:<n° dans la bibliothèque> » (library.js).
const libraryId = (songId) => (String(songId).startsWith('midi:') ? Number(songId.slice(5)) : null);
const usingMidi = () => libraryId(songState.songId) != null && songState.midi;

function buildSongProgram() {
  if (usingMidi()) {
    const m = songState.midi;
    const bassTrack = m.tracks[songState.track];
    const others = m.tracks.filter((t, i) => i !== songState.track && !t.percussion).flatMap((t) => t.notes);
    const end = Math.max(...m.tracks.flatMap((t) => t.notes.map((n) => n.t + n.dur)));
    const bars = Math.max(1, Math.ceil(end / m.beatsPerBar));
    const drums = gmDrumEvents(m.tracks.filter((t) => t.percussion).flatMap((t) => t.notes));
    return makeProgram({
      events: spellEvents(bassTrack.notes, null, m.fifths ?? 0),
      fifths: m.fifths ?? 0,
      meter: m.meter ?? null,
      pulse: m.pulse ?? 1,
      others,
      drums,
      bars,
      bpb: m.beatsPerBar,
      labels: Array.from({ length: bars }, (_, b) => `Mesure ${b + 1}/${bars}`),
    });
  }
  const bars = expandSong(currentSong(), songState.choruses);
  const perChorus = bars.length / songState.choruses;
  const chordAt = (t) => {
    const chords = bars[Math.floor(t / BEATS)]?.chords;
    return chords?.[Math.floor((t % BEATS) / (BEATS / chords.length))] ?? null;
  };
  const fifths = currentSong().fifths ?? 0;
  return makeProgram({
    events: spellEvents(bassLine(bars, songState.seed, songState.style), chordAt, fifths),
    fifths,
    drumStyle: songState.style,
    chordBars: bars.map((b) => b.chords),
    bars: bars.length,
    bpb: BEATS,
    labels: bars.map((b, i) =>
      `Section ${b.section} · Mesure ${(i % perChorus) + 1}/${perChorus} · Chorus ${b.chorus}/${songState.choruses}`),
  });
}

// Point de départ de la lecture (en temps, toujours au début d'une mesure) : on le place en touchant la tab.
let cue = 0;
// Boucle sur quelques mesures (en temps, début et fin de mesure) : null = pas de boucle.
// Elle se place avec les boutons Début / Fin ; arrivée à rangeEnd, la lecture repart de rangeStart.
let rangeStart = null, rangeEnd = null;
// Ce que place le prochain toucher sur la tab : null (point de départ), 'start' ou 'end' (boucle).
let touchMode = null;

const scaleState = {
  type: 'major',
  key: '0',          // hauteur de la tonique (0 = Do), ou 'all'
  range: '2',        // '1', '2' octaves ou 'neck' (tout le manche)
  direction: 'both', // 'up', 'down', 'both'
  rhythm: 2,         // notes par temps
  fingering: '3nps', // '3nps', 'position' ou 'boxes'
  zone: 'auto',      // zone du manche (3 notes par corde, en position)
  box: 'all',        // numéro de box, ou 'all'
};
let scaleKeys = [];   // résumé par tonalité, pour l'affichage

const fingerState = {
  exercise: 'chroma',
  variant: '',       // permutation ou couple de doigts (selon l'exercice)
  fret: 7,           // case de départ (doigt 1), en milieu de manche
  strings: 'all',
  direction: 'both', // 'down' (Sol → Mi) ou 'both' (aller-retour)
  rhythm: 2,
  progression: 'two', // la main recule vers la tête : de 2 en 2, case par case, ou sur place
};
let fingerKeys = [];

function buildFingerProgram(state = fingerState) {
  const ex = buildFingerExercise(state);
  if (state === fingerState) fingerKeys = ex.keys;
  return makeProgram({ events: ex.events, bars: ex.bars, bpb: BEATS, labels: ex.labels });
}

function buildScaleProgram(state = scaleState) {
  const ex = buildScaleExercise(state);
  if (state === scaleState) scaleKeys = ex.keys;
  return makeProgram({
    events: ex.events,
    chordBars: ex.chordBars,
    bars: ex.bars,
    bpb: BEATS,
    labels: ex.labels,
  });
}

const tab = createTab($('tab'), {
  onSeek: (beat) => seek(Math.floor(beat / prog.bpb)),
  labels: document.querySelector('.tab-labels'),
});

// Ligne orange sous les réglages : résumé du mode en cours (ligne inventée, gamme, morceau).
let inventedLabel = '';   // description de la dernière ligne inventée (mode Boucle)
const selectedText = (id) => $(id).selectedOptions[0]?.textContent ?? '';

function updateInfo() {
  let text;
  if (mode === 'loop') {
    text = $('preset').value === 'invented' && inventedLabel
      ? inventedLabel
      : `${selectedText('preset')} · ${loopState.bars} mesures`;
    if (loopState.meter !== '4/4') text += ` · ${selectedText('meter')}`;
  } else if (mode === 'scale') {
    const what = scaleKeys.length > 1
      ? `Gamme ${SCALE_TYPES[scaleState.type].label.toLowerCase()} · toutes les tonalités`
      : scaleKeys[0]?.label.split(' · ')[0] ?? '';
    const parts = [what];
    if (scaleState.fingering === 'boxes') parts.push(selectedText('scaleBox'));
    else parts.push(selectedText('scaleRange'));
    parts.push(selectedText('scaleDir'), selectedText('scaleRhythm'), selectedText('scaleFinger'));
    if (scaleState.fingering !== 'boxes' && scaleState.zone !== 'auto') parts.push(`zone ${selectedText('scaleZone').toLowerCase()}`);
    text = parts.join(' · ');
  } else if (mode === 'finger') {
    text = [`${fingerKeys[0]?.label ?? ''}`, selectedText('fingerStrings'), selectedText('fingerRhythm')].join(' · ');
  } else {
    text = usingMidi()
      ? `MIDI : ${songState.midi.title}`
      : `${currentSong().title} · ${songState.choruses} chorus · ${STYLES[songState.style]}`;
  }
  $('loopInfo').textContent = text;
  $('loopInfo').hidden = !text;
  $('npInfo').textContent = text;
}

const isLooping = () => (mode === 'loop' && $('loop').checked) || (mode === 'scale' && $('scaleLoop').checked)
  || (mode === 'finger' && $('fingerLoop').checked) || (mode === 'song' && $('songLoop').checked);
// « Enchaîner » : chaque fin de boucle lance une nouvelle improvisation (mode Boucle)
// ou la même gamme une quarte plus haut (mode Gammes, cycle des quartes).
const chaining = () => rangeEnd == null && (
  (mode === 'loop' && $('loop').checked && $('chain').checked && $('preset').value === 'invented')
  || (mode === 'scale' && $('scaleLoop').checked && $('scaleChain').checked && scaleState.key !== 'all')
  || (mode === 'finger' && $('fingerLoop').checked && $('fingerChain').checked));
const nextScaleKey = () => String((Number(scaleState.key) + 5) % 12);
// Déliateur enchaîné : l'exercice suivant de la liste (puis retour au premier), avec sa variante par défaut.
function nextFinger() {
  const ids = Object.keys(EXERCISES);
  const exercise = ids[(ids.indexOf(fingerState.exercise) + 1) % ids.length];
  return { ...fingerState, exercise, variant: EXERCISES[exercise].variant ?? '' };
}

// Décalage de la lecture dans la tab : en boucle, à partir du 2e passage on suit la 2e copie de la
// séquence ; en enchaînement, la partie qui joue est après la précédente.
function tabOffset(cycle) {
  if (rangeEnd != null) return 0;
  if (chaining()) return chainPrev?.beats ?? 0;
  return isLooping() && cycle >= 1 ? prog.totalBeats : 0;
}

// Enchaînement en fin de boucle : la partie suivante devient le programme joué (le son change tout de
// suite) ; renvoie la partie qui vient de finir, à passer à showChain() (calé sur le son).
function chainNext() {
  const prev = { events: prog.bassEvents, beats: prog.totalBeats };
  if (mode === 'loop') {
    invent({ next: true });
    prog = buildLoopProgram();
  } else if (mode === 'finger') {
    Object.assign(fingerState, nextFinger());
    prog = buildFingerProgram();
  } else {
    scaleState.key = nextScaleKey();
    prog = buildScaleProgram();
  }
  return prev;
}

function showChain(prev) {
  chainPrev = prev;
  if (mode === 'loop') renderLoopGrid();
  else if (mode === 'finger') {
    $('fingerEx').value = fingerState.exercise;   // sans la fiche : on enchaîne
    updateFingerSelects();
    renderScales();
  } else {
    $('scaleKey').value = scaleState.key;
    renderScales();
  }
}

// Partie qui suivra celle qui joue : { events, beats }.
function upcomingPart() {
  let p;
  if (mode === 'loop') {
    if (upcoming?.bars !== loopState.bars) upcoming = improvise(loopState.drums);
    p = buildLoopProgram({ ...loopState, ...upcoming.state });
  } else if (mode === 'finger') {
    p = buildFingerProgram(nextFinger());
  } else {
    p = buildScaleProgram({ ...scaleState, key: nextScaleKey() });
  }
  return { events: p.bassEvents, beats: p.totalBeats };
}

// Chiffrage de la mesure (fichier MIDI : celui du fichier ; morceaux et gammes : 4/4).
const timeSig = () => prog.meter ?? (prog.bpb === 4 ? '4/4' : `${prog.bpb}/4`);

function renderTab() {
  const T = prog.totalBeats;
  if (!chaining()) {
    chainPrev = upcoming = null;
    // En boucle, la tab montre la suite (le début de la séquence suivante) après un double trait
    // (pas pendant le travail d'une sélection, qui revient simplement à son début).
    tab.render(prog.bassEvents, T, prog.bpb, {
      loopLen: isLooping() && rangeEnd == null ? T : 0, pulse: prog.pulse, timeSig: timeSig(), final: !isLooping(),
    });
    return;
  }
  const parts = [chainPrev, { events: prog.bassEvents, beats: T }, upcomingPart()].filter(Boolean);
  tab.render(prog.bassEvents, T, prog.bpb, { parts, pulse: prog.pulse, timeSig: timeSig() });
}

function refresh() {
  prog = mode === 'loop' ? buildLoopProgram() : mode === 'song' ? buildSongProgram()
    : mode === 'finger' ? buildFingerProgram() : buildScaleProgram();
  if (cue >= prog.totalBeats) cue = 0;
  if (rangeEnd != null && rangeEnd > prog.totalBeats) rangeStart = rangeEnd = null;
  renderTab();
  $('chainField').hidden = !$('loop').checked;
  $('scaleChainField').hidden = !$('scaleLoop').checked || scaleState.key === 'all';
  $('fingerChainField').hidden = !$('fingerLoop').checked;
  showRange();
  tab.setKey(prog.barSig[cue / prog.bpb] ?? 0);
  updateInfo();
  if (waiting) resetWaiting();   // exercice modifié pendant l'attente : on repart de son début
}

function showRange() {
  tab.setRange(rangeEnd != null ? { start: rangeStart, end: rangeEnd } : null);
  tab.setCue(cue);
  $('clearRange').hidden = rangeEnd == null;
}

// Toucher une mesure : point de départ de la lecture, ou (après Début / Fin) début ou fin de la boucle.
// Pendant la lecture, on y saute tout de suite.
function seek(bar) {
  const bars = prog.totalBeats / prog.bpb;
  bar = Math.min(Math.max(0, bar), bars - 1);
  const hadRange = rangeEnd != null;
  const placing = touchMode;
  if (placing === 'start') {
    // Début de la boucle (sans fin encore : boucle d'une mesure, à agrandir avec Fin).
    rangeStart = bar * prog.bpb;
    if (rangeEnd == null || rangeEnd <= rangeStart) rangeEnd = rangeStart + prog.bpb;
    cue = rangeStart;
  } else if (placing === 'end') {
    // Fin de la boucle = fin de la mesure touchée (si elle est avant le début, on inverse).
    const start = rangeStart ?? cue;
    if (bar * prog.bpb >= start) [rangeStart, rangeEnd] = [start, (bar + 1) * prog.bpb];
    else [rangeStart, rangeEnd] = [bar * prog.bpb, start + prog.bpb];
    if (cue < rangeStart || cue >= rangeEnd) cue = rangeStart;
  } else {
    cue = bar * prog.bpb;
  }
  if (placing) setTouchMode(null);   // Début / Fin ne servent qu'au toucher suivant
  if (hadRange !== (rangeEnd != null)) refresh();   // la tab change d'affichage (copies de boucle)
  showRange();
  if (waiting) {
    resetWaiting();   // mode attente : on attend la première note de la nouvelle position
  } else if (playing) {
    // Boucle placée pendant la lecture : on continue si on est dedans, sinon on va à son début.
    if (placing && step >= rangeStart && step < rangeEnd) return;
    step = cue;
    bass.triggerRelease();
    pad.releaseAll();
    other.releaseAll();
  } else {
    showCue();
    tab.follow(null);   // fait défiler la tab jusqu'au repère
  }
}

// En haut à droite : seulement « mesure / temps » ; le détail (section, chorus…) est dans l'infobulle.
function showCue() {
  tab.setKey(prog.barSig[cue / prog.bpb] ?? 0);
  const bar = cue / prog.bpb;
  $('position').textContent = cue === 0 && rangeEnd == null ? '– / –' : `${bar + 1} / 1`;
  $('position').title = rangeEnd != null
    ? (rangeEnd - rangeStart === prog.bpb ? `Boucle sur la mesure ${rangeEnd / prog.bpb}`
      : `Boucle sur les mesures ${rangeStart / prog.bpb + 1} à ${rangeEnd / prog.bpb}`)
    : cue === 0 ? 'Mesure / temps' : `Départ : ${prog.labels[bar]}`;
}

// ---------- Interface ----------

const grid = $('grid');
const chart = $('chart');

function option(value, label, selected) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  o.selected = selected;
  return o;
}

function renderLoopGrid() {
  grid.innerHTML = '';
  for (let b = 0; b < loopState.bars; b++) {
    const bar = document.createElement('div');
    bar.className = 'bar';

    const head = document.createElement('div');
    head.className = 'bar-head';
    head.textContent = `Mesure ${b + 1}`;
    const chordSel = document.createElement('select');
    const choices = LOOP_CHORDS.includes(loopState.chords[b]) ? LOOP_CHORDS : [loopState.chords[b], ...LOOP_CHORDS];
    for (const c of choices) chordSel.append(option(c, parseChord(c).label, c === loopState.chords[b]));
    chordSel.addEventListener('change', () => { loopState.chords[b] = chordSel.value; refresh(); });
    head.append(chordSel);

    const steps = document.createElement('div');
    steps.className = 'steps';
    const { beats } = meterOf();
    steps.style.gridTemplateColumns = `repeat(${beats}, 1fr)`;
    for (let t = 0; t < beats; t++) {
      const i = b * beats + t;
      const sel = document.createElement('select');
      sel.dataset.step = i;
      sel.append(option('', '—', loopState.bass[i] == null));
      for (const m of BASS_NOTES) sel.append(option(m, gridLabel(m), m === loopState.bass[i]));
      sel.classList.toggle('rest', loopState.bass[i] == null);
      sel.addEventListener('change', () => {
        loopState.bass[i] = sel.value === '' ? null : Number(sel.value);
        loopState.frets[i] = null;   // note modifiée : la tab choisit la position
        sel.classList.toggle('rest', loopState.bass[i] == null);
        refresh();
      });
      steps.append(sel);
    }

    bar.append(head, steps);
    grid.append(bar);
  }
  refresh();
}

// Grille d'accords du morceau (un seul chorus affiché) ou mesures du MIDI.
function renderChart() {
  chart.innerHTML = '';
  let bars, info;
  if (usingMidi()) {
    const m = songState.midi;
    const t = m.tracks[songState.track];
    bars = Array.from({ length: prog.totalBeats / prog.bpb }, () => ({ chords: [] }));
    info = `MIDI importé · piste « ${t.name} » · ${t.notes.length} notes`;
  } else {
    const song = currentSong();
    bars = expandSong(song, 1);
    info = `${song.composer ? song.composer + ' · ' : ''}forme ${song.form.join('')} · ligne générée : ${STYLES[songState.style]}`;
  }
  $('songInfo').textContent = info;
  bars.forEach((bar, i) => {
    const cell = document.createElement('div');
    cell.className = 'chart-bar';
    cell.dataset.bar = i;
    if (bar.sectionStart) {
      const sec = document.createElement('span');
      sec.className = 'sec';
      sec.textContent = bar.section;
      cell.append(sec);
    }
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    cell.append(num, bar.chords.map((c) => parseChord(c).label).join(' / '));
    chart.append(cell);
  });
}

function renderSong() {
  refresh();
  renderChart();
  const midi = usingMidi();
  $('chorusCtl').hidden = midi;
  $('styleCtl').hidden = midi;
  $('regenCtl').hidden = midi;
  $('midiCtl').hidden = !midi;
  $('forgetMidi').parentElement.hidden = !(midi && libraryId(songState.songId));   // 0 : pas gardé
}

function updateSongSelect() {
  const sel = $('song');
  sel.innerHTML = '';
  const groups = new Map();   // rubriques dans l'ordre de la liste
  for (const s of SONGS) {
    if (!groups.has(s.group)) {
      const g = document.createElement('optgroup');
      g.label = s.group ?? 'Morceaux';
      groups.set(s.group, g);
      sel.append(g);
    }
    groups.get(s.group).append(option(s.id, s.title, s.id === songState.songId));
  }
  if (myMidi.length) {
    const group = document.createElement('optgroup');
    group.label = 'Mes fichiers MIDI';
    for (const x of myMidi) group.append(option(`midi:${x.id}`, x.title, `midi:${x.id}` === songState.songId));
    sel.append(group);
  }
}

// Fichiers MIDI gardés dans la bibliothèque (titres seulement), pour le menu Morceau.
let myMidi = [];
async function refreshLibrary() {
  try { myMidi = await library.listSongs(); } catch { myMidi = []; }
  updateSongSelect();
}

// Ouvre un morceau MIDI lu par readMidiFile (id : son n° dans la bibliothèque).
function useMidi(m, id, track) {
  if (playing) stop();
  songState.midi = m;
  songState.track = track != null && track < m.tracks.length ? track : guessBassTrack(m.tracks);
  songState.songId = `midi:${id}`;
  cue = 0;
  rangeStart = rangeEnd = null;
  const trackSel = $('track');
  trackSel.innerHTML = '';
  m.tracks.forEach((t, i) => trackSel.append(option(i, `${t.name}${t.percussion ? ' (batterie)' : ''}`, i === songState.track)));
  updateSongSelect();
  setTempo(m.bpm);
  renderSong();
  saveSoon();   // la lecture du fichier peut finir après la sauvegarde déclenchée par le menu
}

// Rouvre un morceau de la bibliothèque. Renvoie faux s'il n'existe plus ou ne se lit pas.
async function openLibrarySong(id) {
  try {
    const x = await library.getSong(id);
    if (!x) return false;
    useMidi(await readMidiFile(x.file), id, x.track);
    return true;
  } catch {
    return false;
  }
}

function setMode(m) {
  if (playing) stop();
  if (m !== 'song') setRecorderOpen(false);
  mode = m;
  chainPrev = null;
  cue = 0;
  rangeStart = rangeEnd = null;
  $('loopControls').hidden = mode !== 'loop';
  $('songControls').hidden = mode !== 'song';
  $('scaleControls').hidden = mode !== 'scale';
  $('fingerControls').hidden = mode !== 'finger';
  grid.hidden = mode !== 'loop';
  $('songView').hidden = mode !== 'song';
  $('scaleView').hidden = mode !== 'scale' && mode !== 'finger';   // même vue : une ligne par exercice
  if (mode === 'loop') {
    refresh();
  } else if (mode === 'song') {
    if (!usingMidi()) setTempo(currentSong().bpm);
    renderSong();
  } else {
    setTempo(mode === 'finger' ? 45 : 80);   // Déliateur : on travaille lentement
    renderScales();
  }
}

// Gammes : une ligne par tonalité avec ses notes ; un clic sur la ligne repart de là.
// (Déliateur : une seule ligne, l'exercice.)
function renderScales() {
  refresh();
  const view = $('scaleList');
  view.innerHTML = '';
  for (const k of mode === 'finger' ? fingerKeys : scaleKeys) {
    const row = document.createElement('div');
    row.className = 'scale-row';
    row.dataset.start = k.startBar;
    row.dataset.end = k.startBar + k.bars;
    const title = document.createElement('div');
    title.className = 'scale-title';
    title.textContent = k.label;
    const notes = document.createElement('div');
    notes.className = 'scale-notes';
    for (const n of k.names) {
      const chip = document.createElement('span');
      chip.textContent = noteLabel(n);
      notes.append(chip);
    }
    row.append(title, notes);
    row.addEventListener('click', () => seek(k.startBar));
    view.append(row);
  }
}

function updateKeySelect() {
  const sel = $('scaleKey');
  sel.innerHTML = '';
  for (const k of keyOptions(scaleState.type)) sel.append(option(k.value, k.label, k.value === scaleState.key));
  // 5 boxes en pentatonique, 7 sinon.
  const boxes = boxOptions(scaleState.type);
  if (!boxes.some((b) => b.value === scaleState.box)) scaleState.box = 'all';
  $('scaleBox').innerHTML = '';
  for (const b of boxes) $('scaleBox').append(option(b.value, b.label, b.value === scaleState.box));
  // Les boxes ont leur propre étendue ; la zone ne sert qu'aux deux autres doigtés.
  const boxMode = scaleState.fingering === 'boxes';
  $('scaleBoxCtl').hidden = !boxMode;
  $('scaleZoneCtl').hidden = boxMode;
  $('scaleRangeCtl').hidden = boxMode;
}

// Mise à jour de l'affichage à chaque temps.
let lit = [];
function showBeat(s) {
  lit.forEach((el) => el.classList.remove('playing'));
  lit = [];
  const chord = s == null ? null : prog.chordAt[s]?.symbol;
  $('npChord').textContent = chord ? parseChord(chord).label : '';
  $('npChord').hidden = !chord;
  if (s == null) {
    showCue();
    return;
  }
  const bar = Math.floor(s / prog.bpb);
  const pulse = Math.floor((s % prog.bpb) / prog.pulse + 1e-6);   // temps dans la mesure (noire pointée en 6/8)
  $('position').textContent = `${bar + 1} / ${pulse + 1}`;
  $('position').title = `${prog.labels[bar]} · Temps ${pulse + 1}`;
  tab.setKey(prog.barSig[bar] ?? 0);   // l'armure suit la tonalité en cours (gammes)
  const els = mode === 'loop'
    ? [grid.querySelector(`[data-step="${Math.floor(s / prog.pulse + 1e-6)}"]`)]
    : mode === 'song'
      ? [chart.querySelector(`[data-bar="${usingMidi() ? bar : bar % chart.children.length}"]`)]
      : [...document.querySelectorAll('.scale-row')].filter((r) => bar >= r.dataset.start && bar < r.dataset.end);
  for (const el of els) {
    if (!el) continue;
    el.classList.add('playing');
    lit.push(el);
  }
}

// ---------- Audio ----------

let bass, pad, other, click, kit;
let step = 0;
let playing = false;
let cycle = 0;          // nombre de passages de la boucle depuis Play
let beatClock = null;   // dernier temps affiché et son heure audio, pour faire défiler la tab en continu

// ---------- Table de mixage ----------
// Une tranche de volume par instrument, réglée en % (100 % = équilibre d'origine, 0 = coupé).

const MIX_CHANNELS = {
  master: 'Général',
  bass: 'Basse',
  pad: 'Accords',
  drums: 'Batterie',
  click: 'Métronome',
  other: 'Autres pistes (MIDI)',
};
const MIX_KEY = 'bassroutine-mix';
const mixLevels = Object.fromEntries(Object.keys(MIX_CHANNELS).map((k) => [k, 100]));
try { Object.assign(mixLevels, JSON.parse(localStorage.getItem(MIX_KEY) || '{}')); } catch { /* stockage indisponible */ }
const mix = {};   // nœuds Tone.Volume, créés au premier Play

const toDb = (pct) => (pct <= 0 ? -Infinity : 20 * Math.log10(pct / 100));

function applyLevel(name) {
  if (name === 'master') Tone.Destination.volume.value = toDb(mixLevels.master);
  else if (mix[name]) mix[name].volume.value = toDb(mixLevels[name]);
}

function renderMixer() {
  const panel = $('mixerChannels');
  for (const [name, label] of Object.entries(MIX_CHANNELS)) {
    const row = document.createElement('label');
    row.className = 'mix-row';
    const text = document.createElement('span');
    text.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 150;
    slider.step = 5;
    slider.value = mixLevels[name];
    const value = document.createElement('output');
    value.textContent = `${mixLevels[name]} %`;
    slider.addEventListener('input', () => {
      mixLevels[name] = Number(slider.value);
      value.textContent = `${slider.value} %`;
      applyLevel(name);
      try { localStorage.setItem(MIX_KEY, JSON.stringify(mixLevels)); } catch { /* stockage indisponible */ }
    });
    row.append(text, slider, value);
    panel.append(row);
  }
}

function initAudio() {
  for (const name of Object.keys(MIX_CHANNELS)) {
    if (name !== 'master') mix[name] = new Tone.Volume().toDestination();
    applyLevel(name);
  }

  bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 2 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.15 },
    filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2, baseFrequency: 120, octaves: 2.5 },
    volume: -6,
  }).connect(mix.bass);

  reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).connect(mix.pad);
  pad = makePad($('padSound').value);
  kit = createKit(mix.drums);

  other = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
    volume: -16,
  }).connect(mix.other);

  click = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    volume: -16,
  }).connect(mix.click);

  Tone.Transport.scheduleRepeat(tick, '4n');
}

// Sons d'accords, tous passés dans une réverbe (dest).
let reverb;
const PAD_SOUNDS = {
  // Piano électrique façon Rhodes : FM douce, attaque nette, extinction lente.
  epiano: (dest) => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 2.5,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.005, decay: 1.6, sustain: 0.25, release: 1.2 },
    modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.1, release: 0.3 },
    volume: -12,
  }).connect(dest),
  // Nappe : dents de scie désaccordées, filtrées, attaque lente.
  pad: (dest) => {
    const filter = new Tone.Filter(900, 'lowpass').connect(dest);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 25 },
      envelope: { attack: 0.6, decay: 0.5, sustain: 0.8, release: 1.5 },
      volume: -24,
    });
    synth.connect(filter);
    synth.onDispose = () => filter.dispose();
    return synth;
  },
  // Vibraphone : FM cloche, sans tenue.
  vibes: (dest) => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 4,
    modulationIndex: 1.2,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.001, decay: 2.2, sustain: 0, release: 1.5 },
    modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 },
    volume: -14,
  }).connect(dest),
  // Cordes (section de violons) : dents de scie désaccordées, vibrato, archet qui s'installe doucement.
  strings: (dest) => chain(dest, new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 4, spread: 18 },
    envelope: { attack: 0.35, decay: 0.3, sustain: 0.85, release: 1.2 },
    volume: -26,
  }), [new Tone.Vibrato(5.5, 0.08), new Tone.Filter(2600, 'lowpass')], { transpose: 12 }),
  // Cuivres : le filtre s'ouvre à l'attaque (le « souffle » du cuivre), puis se referme un peu.
  brass: (dest) => chain(dest, new Tone.PolySynth(Tone.MonoSynth, {
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 1, rolloff: -24 },
    envelope: { attack: 0.04, decay: 0.3, sustain: 0.75, release: 0.35 },
    filterEnvelope: { attack: 0.06, decay: 0.4, sustain: 0.5, release: 0.4, baseFrequency: 350, octaves: 3 },
    volume: -22,
  }), []),
  // Flûtes : son presque pur, petit vibrato, jouées une octave plus haut.
  flute: (dest) => chain(dest, new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.09, decay: 0.2, sustain: 0.8, release: 0.5 },
    volume: -16,
  }), [new Tone.Vibrato(5, 0.05)], { transpose: 12 }),
  // Orgue : tirettes (fondamentale + harmoniques), son tenu, léger chorus.
  organ: (dest) => chain(dest, new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'custom', partials: [1, 0.6, 0.3, 0, 0.2, 0, 0.1, 0.05] },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.15 },
    volume: -22,
  }), [new Tone.Chorus(2, 2.5, 0.4).start()]),
  // Guitare jazz : attaque pincée qui s'éteint, accords grattés note après note.
  guitar: (dest) => chain(dest, new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fattriangle', count: 2, spread: 8 },
    envelope: { attack: 0.003, decay: 1.4, sustain: 0.05, release: 0.6 },
    volume: -14,
  }), [new Tone.Filter(2200, 'lowpass')], { strum: 0.03 }),
};

// Branche synth -> effets -> dest ; options : transpose (demi-tons), strum (décalage entre les notes, s).
function chain(dest, synth, effects, options = {}) {
  synth.chain(...effects, dest);
  synth.onDispose = () => effects.forEach((fx) => fx.dispose());
  return Object.assign(synth, options);
}

const makePad = (kind) => (PAD_SOUNDS[kind] ?? PAD_SOUNDS.epiano)(reverb);

// Appelé à chaque temps : joue tous les événements qui tombent dans ce temps.
function tick(time) {
  if (rangeEnd != null && step === rangeEnd) {   // boucle : retour à son début
    step = rangeStart;
    if (lapDone(time)) return;
  }
  if (step >= prog.totalBeats) {
    if (!isLooping()) {
      if (match) match.done = true;
      Tone.Transport.stop(time);
      Tone.Draw.schedule(stopUI, time);
      return;
    }
    step = 0;
    cycle++;
    if (lapDone(time)) return;
    if (chaining()) {
      const prev = chainNext();
      Tone.Draw.schedule(() => showChain(prev), time);
    }
  }
  const s = step++;
  const beat = s % prog.bpb;
  const beatDur = 60 / Tone.Transport.bpm.value;
  const at = (e) => time + (e.t - s) * beatDur;
  // Pistes envoyées à un instrument MIDI (réglages) : le son interne se tait.
  const ctx = Tone.getContext().rawContext;
  const toMidi = (track) => midiOut.routedToMidi(track);

  const expected = [];   // mode Jeu : notes à jouer par le bassiste (la basse de l'app se tait)
  for (const e of prog.bassByBeat[s] ?? []) {
    if (match) {
      if (e.midi != null) expected.push({ time: at(e), midi: e.midi, t: e.t, lap: match.lap, cycle });
    } else if (toMidi('bass')) midiOut.playNotes('bass', e.midi, e.dur * beatDur, at(e), e.vel ?? 0.8, ctx);
    else bass.triggerAttackRelease(Tone.Frequency(e.midi, 'midi'), e.dur * beatDur, at(e), e.vel ?? 0.8);
  }
  if (expected.length) match.expected.push(...expected);
  if ($('others').checked) {
    for (const e of prog.otherByBeat[s] ?? []) {
      if (toMidi('other')) midiOut.playNotes('other', e.midi, e.dur * beatDur, at(e), e.vel ?? 0.6, ctx);
      else other.triggerAttackRelease(Tone.Frequency(e.midi, 'midi'), e.dur * beatDur, at(e), e.vel ?? 0.6);
    }
  }
  if ($('synth').checked) playChords(s, time, beatDur, ctx);
  if ($('drums').checked) {
    // « Auto » : rythme du style (ou batterie du fichier MIDI) ; sinon le rythme choisi dans le menu.
    const choice = $('drumStyle').value;
    const fileDrums = choice === 'auto' && prog.drumByBeat;
    const hits = fileDrums
      ? prog.drumByBeat[s] ?? []
      : patternHits(choice === 'auto' ? prog.drumStyle : choice, s, prog.bpb, $('fills').checked, prog.meter);
    const play = toMidi('drums') ? (h, t) => midiOut.playDrum(h, t, ctx) : (h, t) => kit.play(h, t);
    for (const h of hits) play(h, at(h));
    if (s === 0 && !fileDrums) play({ d: 'crash', v: 0.6 }, time);
  }
  if ($('metro').checked) {
    // Un clic par temps de la mesure (noire, ou noire pointée en 6/8 et 12/8) qui tombe dans cette noire.
    for (let p = Math.ceil(beat / prog.pulse - 1e-6) * prog.pulse; p < beat + 1 - 1e-6; p += prog.pulse) {
      const first = p < 1e-6;
      click.triggerAttackRelease(first ? 'C6' : 'G5', '32n', time + (p - beat) * beatDur, first ? 0.8 : 0.45);
    }
  }
  const c = cycle;
  Tone.Draw.schedule(() => {
    if (!playing) return;   // temps préparé juste avant Stop : on ne l'affiche pas
    for (const e of expected) e.view = e.t + tabOffset(c);   // place de la note dans la tab affichée
    beatClock = { s, time, cycle: c };
    showBeat(s);
  }, time);
}

// Temps joué après s (fin de la boucle de mesures, fin de l'exercice) ; -1 = arrêt.
function stepAfter(s) {
  let n = s + 1;
  if (rangeEnd != null && n === rangeEnd) n = rangeStart;
  if (n >= prog.totalBeats) n = isLooping() ? 0 : -1;
  return n;
}

// Accompagnement en cours : voicing joué (pour enchaîner le suivant), coups de la mesure, anticipation.
const comp = { next: -1, bar: -1, hits: [], pushed: false, voicing: null, start: null };

// Voicing de l'accord qui sonne au temps beat, enchaîné depuis le précédent (calculé une fois par accord).
function chordVoicing(beat) {
  const c = prog.chordAt[beat];
  if (!c) return null;
  if (comp.start !== c.start) {
    comp.voicing = voiceLead(parseChord(c.symbol), comp.voicing);
    comp.start = c.start;
  }
  return comp.voicing;
}

// Accords du temps s : tenus (nappe, cordes… ou case « tenus »), sinon rythme selon le style de batterie.
function playChords(s, time, beatDur, ctx) {
  const toMidi = midiOut.routedToMidi('pad');
  const play = (notes, at, dur, vel) => {
    if (toMidi) return midiOut.playNotes('pad', notes, dur, at, Math.min(1, vel + 0.1), ctx);
    const freqs = notes.map((m) => Tone.Frequency(m + (pad.transpose ?? 0), 'midi'));
    if (pad.strum) freqs.forEach((f, i) => pad.triggerAttackRelease(f, dur - i * pad.strum, at + i * pad.strum, vel));
    else pad.triggerAttackRelease(freqs, dur, at, vel);
  };
  if (s !== comp.next) { comp.bar = -1; comp.pushed = false; }   // départ ou saut : on repart sur une mesure neuve
  comp.next = stepAfter(s);

  if ($('padHeld').checked || HELD_SOUNDS.has($('padSound').value)) {
    const chord = prog.chordStarts[s];
    if (chord) play(chordVoicing(s), time, chord.beats * beatDur * 0.95, 0.5);
    return;
  }
  const bpb = prog.bpb, bar = Math.floor(s / bpb), beat = s % bpb;
  if (bar !== comp.bar) {
    const choice = $('drumStyle').value;
    const style = choice === 'auto' ? prog.drumStyle : choice;
    comp.hits = compBar(style, bar, bpb, { guitar: $('padSound').value === 'guitar', pushed: comp.pushed, meter: prog.meter });
    comp.bar = bar;
    comp.pushed = false;
  }
  for (const h of comp.hits) {
    if (Math.floor(h.t) !== beat) continue;
    let target = s;
    if (h.push) {
      // Anticipation : l'accord de la mesure suivante, joué juste avant elle.
      const n = stepAfter(bar * bpb + bpb - 1);
      if (n >= 0 && prog.chordAt[n]) { target = n; comp.pushed = true; }
    }
    const notes = chordVoicing(target);
    if (notes) play(notes, time + (h.t - beat) * beatDur, h.dur * beatDur, h.vel);
  }
}

function frame() {
  if (!playing) return;
  if (beatClock) {
    const beatDur = 60 / Tone.Transport.bpm.value;
    const frac = Math.min(1, Math.max(0, (Tone.context.currentTime - beatClock.time) / beatDur));
    // En boucle, à partir du 2e passage on suit la 2e copie de la séquence dans la tab :
    // le retour de la fin de la 2e copie au début de la 2e est invisible (contenu identique).
    // Improvisations enchaînées : même principe, la tab est redessinée décalée d'une improvisation.
    const copy = tabOffset(beatClock.cycle);
    tab.follow(beatClock.s + frac + copy);
  }
  if (match) sweepMisses();
  requestAnimationFrame(frame);
}

// Réveille l'audio. Sur iPhone, le contexte audio peut être suspendu ou « interrompu »
// (appel, autre app, écran verrouillé…) : on le relance sans jamais rester bloqué à l'attendre.
// record : le micro va servir (mode attente), il faut une session « lecture et enregistrement ».
async function wakeAudio(record = false) {
  // iOS 17+ : joue même si le bouton silencieux est activé. À ne régler que si ça change :
  // le redéfinir pendant que l'audio tourne peut interrompre le son sur iPhone.
  const session = record ? 'play-and-record' : 'playback';
  if (navigator.audioSession && navigator.audioSession.type !== session) navigator.audioSession.type = session;
  const raw = Tone.getContext().rawContext;
  if (raw.state !== 'running') {
    await Promise.race([Tone.start(), new Promise((r) => setTimeout(r, 1000))]);
  }
  return raw.state === 'running';
}

// Audio réveillé et sons créés (hors lecture : saisie au clavier MIDI).
async function audioReady() {
  const ok = await wakeAudio();
  if (ok && !bass) initAudio();
  return ok;
}

let starting = false;   // évite deux démarrages si on touche Play deux fois très vite
async function start() {
  if (starting) return;
  starting = true;
  try {
    setTunerOpen(false);   // l'accordeur libère l'entrée audio
    recorder.stopLive();   // une prise en temps réel en cours est abandonnée
    if ($('waitMode').checked) {
      await startWaiting();
      return;
    }
    const ok = await wakeAudio(gameOn());
    if (!ok) {
      showMessage('Le son est bloqué par l\'iPhone : touche Play à nouveau.');
      return;
    }
    if (!bass) initAudio();   // (voir aussi audioReady)
    if (gameOn() && !(await openGameInput())) return;
    if (Tone.Transport.state !== 'stopped') Tone.Transport.stop();   // transport resté en route : on repart propre
    begin();
  } finally {
    starting = false;
  }
}

// Décompte avant le départ : de 1 à 4 temps (noire, ou noire pointée en 6/8 et 12/8), le premier
// plus aigu, le temps compté affiché à la place de la position ; puis l'exercice démarre.
// Chaque clic est déclenché juste avant son heure : Stop pendant le décompte annule les suivants.
let countTimers = [];
function cancelCount() {
  countTimers.forEach(clearTimeout);
  countTimers = [];
}

function begin() {
  Tone.Transport.bpm.value = transportBpm();
  step = cue;
  cycle = 0;
  beatClock = null;
  if (gameOn()) beginGame();
  const beats = Number($('countIn').value);
  const beatDur = 60 / Number($('tempo').value);   // le tempo compte les temps de la mesure
  const t0 = Tone.now() + 0.1;
  for (let i = 0; i < beats; i++) {
    const at = t0 + i * beatDur;
    countTimers.push(setTimeout(() => {
      click.triggerAttackRelease(i === 0 ? 'C6' : 'G5', '32n', at, i === 0 ? 0.8 : 0.5);
      $('position').textContent = `${i + 1}…`;
    }, Math.max(0, (at - Tone.now() - 0.05) * 1000)));
  }
  Tone.Transport.start(t0 + beats * beatDur);
  playing = true;
  setPlayButton(true);
  requestAnimationFrame(frame);
}

function stop() {
  cancelCount();
  Tone.Transport.stop();
  Tone.Draw.cancel(0);   // affichages déjà programmés (temps suivants) : on les annule
  bass?.triggerRelease();
  pad?.releaseAll();
  other?.releaseAll();
  midiOut.silence();
  stopWaiting();
  stopUI();
  idleAudio();
}

// ---------- Mode 🎯 Jeu ----------
// La lecture tourne normalement, la basse de l'app se tait : chaque note attendue est jugée sur la
// justesse et sur le rythme (attaque entendue par l'entrée audio), puis la partie reçoit une note sur 10.

let match = null;   // partie en cours : { expected, results, lap, lapScores, exercise, cue, done, ending, stopAt }
const gameOn = () => $('gameMode').checked;

async function openGameInput() {
  if (!pitch.inputSupported()) {
    showMessage('Ce navigateur ne donne pas accès au micro ni à l\'interface audio.');
    return false;
  }
  try {
    await pitch.openInput(Tone.getContext().rawContext, { onNote: gameHeard });
  } catch (err) {
    showMessage(`Pas d'accès au micro / à l'interface audio (${err.name}). Autorise-le dans le navigateur.`);
    return false;
  }
  renderInputPanel();
  return true;
}

function beginGame() {
  match = { expected: [], results: [], lap: 0, lapScores: [], exercise: $('loopInfo').textContent || mode, cue };
  tab.clearMarks();
  showLiveScore();
}

function showLiveScore() {
  $('gameLive').hidden = !match;
  document.body.classList.toggle('gaming', !!match);   // téléphone en portrait : la note remplace le compteur
  if (match) $('gameLive').textContent = `🎯 ${match.results.length ? game.formatScore(game.score10(match.results)) : '–'}`;
}

// Fin d'un tour de boucle (à l'heure audio time) ; vrai si la partie est finie (nombre de tours atteint).
function lapDone(time) {
  if (!match) return false;
  const lap = match.lap++;
  // Note du tour une fois ses dernières notes jugées.
  const wait = time - Tone.context.currentTime + game.matchWindow() + game.gameSettings().offset / 1000 + 0.2;
  const m = match;
  setTimeout(() => {
    const res = m.results.filter((r) => r.lap === lap);
    if (!res.length) return;
    m.lapScores[lap] = game.score10(res);
    if (Number(game.gameSettings().tours) !== 1) showMessage(`🎯 Tour ${lap + 1} : ${game.formatScore(m.lapScores[lap])} / 10`);
  }, Math.max(0, wait * 1000));
  const tours = Number(game.gameSettings().tours);
  if (!tours || match.lap < tours) {
    Tone.Draw.schedule(() => tab.clearMarks(), time);   // nouveau tour : couleurs effacées (le dernier les garde)
    return false;
  }
  match.done = true;
  match.stopAt = time;
  Tone.Transport.stop(time);
  Tone.Draw.schedule(stopUI, time);
  return true;
}

// Note jouée : rattachée à la note attendue la plus proche dans le temps, jugée et colorée dans la tab.
function gameHeard(note) {
  if (!match || !note.attack) return;
  const time = note.onset - game.gameSettings().offset / 1000;
  const win = game.matchWindow();
  let best = null;
  for (const e of match.expected) {
    if (e.judged || Math.abs(e.time - time) > win) continue;
    if (!best || Math.abs(e.time - time) < Math.abs(best.time - time)) best = e;
  }
  if (!best) return;   // note en trop : ni comptée ni pénalisée
  best.judged = true;
  const r = game.judge(best, { time, pitch: note.pitch });
  match.results.push({ ...r, lap: best.lap });
  if (best.view != null) tab.mark(best.view, r.cls);
  showLiveScore();
}

// Notes attendues dont l'heure est passée sans rien entendre : ratées. until : heure de fin de partie.
function sweepMisses(until = null) {
  const late = game.matchWindow() + game.gameSettings().offset / 1000 + 0.1;
  const now = Tone.context.currentTime;
  for (const e of match.expected) {
    if (e.judged) continue;
    if (until != null ? e.time < until : e.time + late < now) {
      e.judged = true;
      match.results.push({ ...game.MISSED, lap: e.lap });
      if (e.view != null) tab.mark(e.view, 'miss');
    } else if (until != null) e.judged = true;   // pas encore jouée à l'arrêt : ignorée
  }
  if (match.expected.length > 200) match.expected = match.expected.filter((e) => !e.judged);
  showLiveScore();
}

// Fin de partie (dernier tour, fin de l'exercice ou Stop) : on laisse le temps aux dernières notes
// d'être entendues, puis le bilan s'affiche.
function endGame() {
  const m = match;
  m.ending = true;
  m.stopAt ??= Tone.context.currentTime;
  const endless = !m.done && isLooping() && Number(game.gameSettings().tours) === 0;
  const title = m.done ? 'Fin de la partie' : endless ? 'Bilan de la séance' : 'Partie arrêtée';
  setTimeout(() => {
    sweepMisses(m.stopAt);
    if (match === m) {
      match = null;
      pitch.closeInput();
    }
    showLiveScore();
    if (m.results.length < 3) {
      showMessage('Partie trop courte pour être notée.');
      return;
    }
    const summary = game.summarize(m.results);
    const record = game.saveRecord(m.exercise, summary.score);
    game.showResult(summary, {
      title,
      record,
      tours: m.lapScores.filter((x) => x != null),
      stopped: !m.done,
      tempo: Number($('tempo').value),
      meter: prog.meter,
      onReplay: () => { cue = m.cue; showRange(); start(); },
    });
  }, (game.matchWindow() + game.gameSettings().offset / 1000 + 0.25) * 1000);
}

// Retard de l'écoute : 4 clics de décompte puis 8 clics où l'on joue une note ; on garde l'écart médian.
async function calibrateGame(status) {
  if (playing) stop();
  if (!(await wakeAudio(true))) { status.textContent = 'Le son est bloqué : réessaie.'; return; }
  if (!bass) initAudio();
  const ctx = Tone.getContext().rawContext;
  const onsets = [];
  try {
    await pitch.openInput(ctx, { onNote: (n) => { if (n.attack) onsets.push(n.onset); } });
  } catch (err) {
    status.textContent = `Pas d'accès au micro / à l'interface audio (${err.name}).`;
    return;
  }
  const beat = 60 / 90, t0 = ctx.currentTime + 0.3, clicks = [];
  for (let i = 0; i < 12; i++) {
    const t = t0 + i * beat;
    click.triggerAttackRelease(i % 4 === 0 ? 'C6' : 'G5', '32n', t, i % 4 === 0 ? 0.8 : 0.5);
    if (i >= 4) clicks.push(t);
  }
  const timer = setInterval(() => {
    const i = Math.floor((ctx.currentTime - t0) / beat);
    status.textContent = i < 4 ? `${4 - Math.max(0, i)}…` : `Joue une note sur chaque clic (${Math.max(0, 12 - i)})`;
  }, 50);
  await new Promise((done) => setTimeout(done, (t0 + 12 * beat + 0.4 - ctx.currentTime) * 1000));
  clearInterval(timer);
  pitch.closeInput();
  idleAudio();
  const gaps = onsets
    .map((o) => clicks.reduce((d, c) => (Math.abs(o - c) < Math.abs(d) ? o - c : d), Infinity))
    .filter((d) => Math.abs(d) < beat / 2)
    .sort((a, b) => a - b);
  if (gaps.length < 4) {
    status.textContent = 'Pas assez de notes entendues : recommence en jouant sur chaque clic.';
    return;
  }
  const ms = Math.max(-100, Math.min(300, Math.round((gaps[gaps.length >> 1] * 1000) / 5) * 5));
  game.setGame({ offset: ms });
  renderGamePanel();
  $('gameStatus').textContent = `Retard mesuré : ${ms} ms`;
}

function renderGamePanel() {
  const panel = $('gamePanel');
  panel.replaceChildren();
  const settings = game.gameSettings();
  const note = (text) => {
    const p = document.createElement('p');
    p.className = 'midi-note';
    p.textContent = text;
    panel.append(p);
  };
  note('Coche « 🎯 Jeu » puis Play : la basse de l\'app se tait, c\'est toi qui joues la ligne. Chaque note est notée '
    + 'sur la justesse et le rythme, et la partie reçoit une note sur 10. Entrée audio : celle de l\'onglet 🎤 Entrée. '
    + 'Avec un casque, le micro n\'entend pas l\'accompagnement : la note est plus fiable.');
  const row = (label, ...inputs) => {
    const line = document.createElement('label');
    line.className = 'midi-row';
    const text = document.createElement('span');
    text.textContent = label;
    line.append(text, ...inputs);
    panel.append(line);
  };
  const select = (choices, value, onChange) => {
    const sel = document.createElement('select');
    for (const [v, label] of Object.entries(choices)) sel.append(new Option(label, v));
    sel.value = String(value);
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  };
  row('Justesse', select(game.GAME_PITCH, settings.pitch, (v) => game.setGame({ pitch: v })), document.createElement('span'));
  row('Rythme', select(game.GAME_RHYTHM, settings.rhythm, (v) => game.setGame({ rhythm: Number(v) })), document.createElement('span'));
  row('Partie (en boucle)', select(game.GAME_TOURS, settings.tours, (v) => game.setGame({ tours: Number(v) })), document.createElement('span'));
  const offset = document.createElement('input');
  offset.type = 'range';
  offset.min = -100;
  offset.max = 300;
  offset.step = 5;
  offset.value = settings.offset;
  const text = document.createElement('span');
  text.textContent = `${settings.offset} ms`;
  offset.addEventListener('input', () => { game.setGame({ offset: Number(offset.value) }); text.textContent = `${offset.value} ms`; });
  row('Retard', offset, text);
  const measure = document.createElement('button');
  measure.textContent = 'Mesurer le retard';
  measure.title = 'Après 4 clics de décompte, joue une note sur chacun des 8 clics suivants';
  const status = document.createElement('span');
  status.id = 'gameStatus';
  status.className = 'midi-note';
  measure.addEventListener('click', () => calibrateGame(status));
  const line = document.createElement('div');
  line.className = 'game-measure';
  line.append(measure, status);
  panel.append(line);
}
renderGamePanel();

// ---------- Mode « Attendre ma note » ----------
// Pas de tempo ni d'accompagnement : le curseur reste sur la note à jouer jusqu'à ce que
// l'entrée audio (basse ou micro) l'entende, octave comprise, puis passe à la suivante.

let waiting = null;   // { notes, i, cycle } pendant l'attente

// La note attendue est celle de la tab (sous le Mi grave, la tab la place une octave plus haut).
const expectedMidi = (e) => (e.fret == null && e.midi < LOW_E ? e.midi + 12 : e.midi);
// Nom d'une note avec son registre, comme dans la grille de la boucle. La note attendue garde
// l'orthographe de l'exercice ; une note entendue a un nom simple (dièses, ou bémols si l'armure en a).
const SHARP_NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const FLAT_NAMES = ['Do', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
const register = (m) => (m >= LOW_E + 24 ? ' suraigu' : m >= LOW_E + 12 ? ' aigu' : ' grave');
const expectedLabel = (e) => noteLabel(e.name ?? pitchName(expectedMidi(e), e.sig ?? 0)) + register(expectedMidi(e));
const heardLabel = (m, sig) => noteLabel((sig < 0 ? FLAT_NAMES : SHARP_NAMES)[m % 12]) + register(m);

// Notes à jouer à partir de from : jusqu'à la fin de la boucle si on part d'avant elle.
function waitingNotes(from = cue) {
  const end = rangeEnd != null && from < rangeEnd ? rangeEnd : prog.totalBeats;
  return prog.bassEvents.filter((e) => e.midi != null && e.t >= from && e.t < end);
}
const inRange = (t) => rangeEnd != null && t < rangeEnd;   // la lecture arrivera à la fin de la boucle

async function startWaiting() {
  if (!pitch.inputSupported()) {
    showMessage('Ce navigateur ne donne pas accès au micro ni à l\'interface audio.');
    return;
  }
  const notes = waitingNotes();
  if (!notes.length) {
    showMessage('Aucune note à jouer à partir d\'ici.');
    return;
  }
  if (!(await wakeAudio(true))) {
    showMessage('Le son est bloqué : touche Play à nouveau.');
    return;
  }
  try {
    await pitch.openInput(Tone.getContext().rawContext, { onNote: heardNote });
  } catch (err) {
    showMessage(`Pas d'accès au micro / à l'interface audio (${err.name}). Autorise-le dans le navigateur.`);
    return;
  }
  renderInputPanel();   // les noms des entrées sont visibles maintenant que l'accès est donné
  waiting = { notes, i: 0, cycle: 0, listening: false };
  playing = true;
  setPlayButton(true);
  $('waitStatus').hidden = false;
  showWaiting();
}

function resetWaiting() {
  const notes = waitingNotes();
  if (!notes.length) { stop(); return; }
  Object.assign(waiting, { notes, i: 0, cycle: 0, listening: false });
  showWaiting();
}

function stopWaiting() {
  if (!waiting) return;
  waiting = null;
  pitch.closeInput();
  $('waitStatus').hidden = true;
}

// feedback : { text, cls } affiché après la note attendue (note fausse, ou justesse à corriger).
function showWaiting(feedback = null) {
  const e = waiting.notes[waiting.i];
  // En boucle, la tab affiche la suite après la fin : on suit la bonne copie (comme frame()).
  const copy = tabOffset(waiting.cycle);
  tab.follow(e.t + copy);
  showBeat(Math.floor(e.t));
  const box = $('waitStatus');
  box.replaceChildren(`À jouer : ${expectedLabel(e)}`);
  if (feedback) {
    const span = document.createElement('span');
    span.className = feedback.cls;
    span.textContent = ` · ${feedback.text}`;
    box.append(span);
  }
}

// Appelé tant qu'une note stable sonne. Une note attaquée est jugée ; si elle n'est pas juste,
// on continue de l'écouter : sur une fretless, on peut corriger en glissant sans rejouer.
let okTimer;
function heardNote({ pitch: played, midi, attack }) {
  if (!waiting) return;
  if (attack) waiting.listening = true;
  if (!waiting.listening) return;   // note déjà validée qui continue de sonner
  const e = waiting.notes[waiting.i];
  const sig = e.sig ?? 0;
  const cents = Math.round((played - expectedMidi(e)) * 100);
  if (Math.abs(cents) <= pitch.inputSettings().tolerance) {
    nextWaitingNote();
  } else if (Math.abs(cents) < 100) {
    const sign = cents > 0 ? '+' : '−';
    showWaiting({ text: `${sign}${Math.abs(cents)} c, trop ${cents > 0 ? 'haut' : 'bas'}`, cls: 'off' });
  } else {
    showWaiting({ text: `entendu : ${heardLabel(midi, sig)}`, cls: 'wrong' });
  }
}

function nextWaitingNote() {
  const box = $('waitStatus');
  box.classList.add('ok');
  clearTimeout(okTimer);
  okTimer = setTimeout(() => box.classList.remove('ok'), 250);
  waiting.listening = false;   // la note suivante devra être attaquée
  waiting.i++;
  if (waiting.i >= waiting.notes.length) {
    if (inRange(waiting.notes[0].t)) {
      waiting.notes = waitingNotes(rangeStart);   // boucle : on reprend à son début
    } else if (!isLooping()) {
      stop();
      showMessage('Bravo, tout est joué !');
      return;
    } else if (chaining()) {
      cue = 0;
      showChain(chainNext());   // refresh() repart du début de la partie suivante
      return;
    } else {
      waiting.notes = waitingNotes(0);   // exercice en boucle : on recommence au début
    }
    if (!waiting.notes.length) { stop(); return; }
    waiting.i = 0;
    waiting.cycle++;
  }
  showWaiting();
}

// Réglages : choix de l'entrée audio, seuil de niveau et vumètre.
function renderInputPanel() {
  const panel = $('inputPanel');
  panel.replaceChildren();
  const note = (text) => {
    const p = document.createElement('p');
    p.className = 'midi-note';
    p.textContent = text;
    panel.append(p);
  };
  if (!pitch.inputSupported()) {
    note('Ce navigateur ne donne pas accès au micro ni à l\'interface audio.');
    return;
  }
  note('Branche la basse dans l\'interface audio (ou utilise le micro), coche « ⏸ Attendre ma note » puis Play : le curseur avance quand la bonne note est jouée.');
  const settings = pitch.inputSettings();
  const row = (label, ...inputs) => {
    const line = document.createElement('label');
    line.className = 'midi-row';
    const text = document.createElement('span');
    text.textContent = label;
    line.append(text, ...inputs);
    panel.append(line);
  };
  const device = document.createElement('select');
  device.append(new Option('Entrée par défaut', ''));
  device.value = settings.device;
  device.addEventListener('change', () => pitch.setInput({ device: device.value }));
  pitch.listInputs().then((inputs) => {
    for (const d of inputs) {
      if (d.deviceId === 'default' || !d.deviceId) continue;
      device.append(new Option(d.label || 'Entrée audio (nom visible après autorisation)', d.deviceId));
    }
    device.value = settings.device;
  });
  row('Entrée', device, document.createElement('span'));
  // Justesse : sur une fretless, resserrer pour travailler la justesse.
  const tolerance = document.createElement('select');
  for (const [cents, label] of Object.entries(pitch.TOLERANCES).reverse()) tolerance.append(new Option(label, cents));
  tolerance.value = String(settings.tolerance);
  tolerance.addEventListener('change', () => pitch.setInput({ tolerance: Number(tolerance.value) }));
  row('Justesse', tolerance, document.createElement('span'));
  // Seuil : en dessous, le son est ignoré (bruit, cordes qui résonnent).
  const threshold = document.createElement('input');
  threshold.type = 'range';
  threshold.min = 0.002;
  threshold.max = 0.1;
  threshold.step = 0.002;
  threshold.value = settings.threshold;
  threshold.addEventListener('input', () => pitch.setInput({ threshold: Number(threshold.value) }));
  const meter = document.createElement('div');
  meter.className = 'input-meter';
  meter.title = 'Niveau entendu (pendant l\'attente)';
  const bar = document.createElement('div');
  meter.append(bar);
  row('Seuil', threshold, meter);
  // Vumètre (il bouge pendant l'attente) : rafraîchi souvent seulement quand les réglages sont ouverts.
  const refreshMeter = () => {
    if (!meter.isConnected) return;   // panneau reconstruit : ce vumètre n'existe plus
    const level = pitch.inputLevel();
    bar.style.width = `${Math.min(100, (level / 0.2) * 100)}%`;
    bar.style.background = level > Number(threshold.value) ? 'var(--accent)' : 'var(--muted)';
    if ($('mixer').hidden) setTimeout(refreshMeter, 500);
    else requestAnimationFrame(refreshMeter);
  };
  refreshMeter();
}
renderInputPanel();
$('waitMode').addEventListener('change', () => {
  if ($('waitMode').checked) $('gameMode').checked = false;   // un seul des deux modes d'écoute
  showGameButton();
  if (playing) stop();
});
$('gameMode').addEventListener('change', () => {
  if ($('gameMode').checked) $('waitMode').checked = false;
  if (playing) stop();
  showGameButton();
});
// Bouton 🎯 de l'en-tête (visible partout, même en paysage) : même effet que la case « 🎯 Jeu ».
$('gameBtn').addEventListener('click', () => {
  $('gameMode').checked = !$('gameMode').checked;
  $('gameMode').dispatchEvent(new Event('change', { bubbles: true }));
  showMessage($('gameMode').checked ? '🎯 Mode Jeu : touche Play et joue la ligne !' : 'Mode Jeu désactivé.');
});
function showGameButton() {
  $('gameBtn').setAttribute('aria-pressed', $('gameMode').checked);
}

// Bouton rond : ▶ à l'arrêt, ■ pendant la lecture.
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const STOP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>';
function setPlayButton(on) {
  $('play').innerHTML = on ? STOP_ICON : PLAY_ICON;
  $('play').setAttribute('aria-label', on ? 'Stop' : 'Play');
  $('play').title = on ? 'Stop (barre d\'espace)' : 'Play (barre d\'espace)';
}

function stopUI() {
  if (match && !match.ending) endGame();
  playing = false;
  beatClock = null;
  setPlayButton(false);
  showBeat(null);
  tab.follow(null);
}

// ---------- Messages à l'écran ----------
// Affiche un message quelques secondes (utile sur iPhone, où on ne voit pas la console).
let messageTimer;
function showMessage(text) {
  const box = $('message');
  box.textContent = text;
  box.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { box.hidden = true; }, 6000);
}
window.addEventListener('error', (e) => showMessage(`Erreur : ${e.message}`));
window.addEventListener('unhandledrejection', (e) => showMessage(`Erreur : ${e.reason?.message ?? e.reason}`));

// Batterie : un contexte audio qui tourne calcule du silence en continu et garde la puce son
// de l'iPhone éveillée. On le met en pause peu après Stop (rien ne joue ni n'écoute) et dès
// que l'app passe en arrière-plan ; wakeAudio le relance au prochain son.
let idleTimer = null;
function idleAudio() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (playing || starting || pitch.inputOpen() || !$('recorder').hidden) return;
    const raw = Tone.getContext().rawContext;
    if (raw.state === 'running') raw.suspend();
  }, 10000);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (playing) stop();
  setTunerOpen(false);
  recorder.stopLive();
  pitch.closeInput();
  clearTimeout(idleTimer);
  const raw = Tone.getContext().rawContext;
  if (raw.state === 'running') raw.suspend();
});

// ---------- Contrôles ----------

// Stop : le prochain Play repart du début de la mesure qui était jouée.
function togglePlay() {
  if (!playing) { start(); return; }
  const at = waiting ? waiting.notes[waiting.i]?.t : beatClock?.s;
  if (at != null) {
    cue = Math.floor(at / prog.bpb) * prog.bpb;
    showRange();
  }
  stop();
}
$('play').addEventListener('click', togglePlay);
// Retour à la mesure 1 (la boucle éventuelle reste en place).
$('rewind').addEventListener('click', () => {
  setTouchMode(null);
  seek(0);
});

// Barre d'outils de la tab : un toucher place le début ou la fin de la sélection.
function setTouchMode(m) {
  touchMode = m;
  document.querySelectorAll('[data-touch]').forEach((b) => {
    const on = b.dataset.touch === m;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
document.querySelectorAll('[data-touch]').forEach((b) => b.addEventListener('click', () =>
  setTouchMode(touchMode === b.dataset.touch ? null : b.dataset.touch)));   // second appui : on annule
$('clearRange').addEventListener('click', () => {
  rangeStart = rangeEnd = null;
  refresh();
  showCue();
});

renderMixer();

// ---------- Instruments MIDI (réglages) ----------
// Chaque piste : son interne, ou une sortie MIDI et son canal. Ordinateur seulement (Web MIDI).
function renderMidi() {
  const panel = $('midiPanel');
  panel.replaceChildren();
  const note = (text) => {
    const p = document.createElement('p');
    p.className = 'midi-note';
    p.textContent = text;
    panel.append(p);
  };
  if (!midiOut.midiSupported()) {
    note('Disponible sur ordinateur avec Chrome, Edge ou Firefox (ni Safari ni iPhone).');
    return;
  }
  if (!midiOut.midiReady()) {
    note('Joue les accompagnements sur un synthé (USB ou interface MIDI) ou dans Ableton / GarageBand (bus IAC du Mac).');
    const btn = document.createElement('button');
    btn.textContent = 'Activer le MIDI';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();   // le panneau se reconstruit : le clic ne doit pas passer pour un clic « en dehors »
      const error = await midiOut.enableMidi(renderMidi);
      if (!error) return;
      // Firefox : refuse d'office si aucun appareil MIDI n'est branché, et demande d'installer
      // un « module de permission » pour le site (à accepter).
      const firefox = /firefox/i.test(navigator.userAgent);
      showMessage(firefox
        ? `Accès MIDI refusé par Firefox (${error}). Branche un instrument ou active le bus IAC, puis réessaie et accepte le module de permission. Sinon, utilise Chrome.`
        : `Accès MIDI refusé par le navigateur (${error}).`);
    });
    panel.append(btn);
    return;
  }
  const ports = midiOut.outputs();
  if (!ports.length) note('Aucune sortie MIDI : branche un instrument, ou active le bus IAC (Configuration audio et MIDI).');
  const row = (label, ...inputs) => {
    const line = document.createElement('label');
    line.className = 'midi-row';
    const text = document.createElement('span');
    text.textContent = label;
    line.append(text, ...inputs);
    panel.append(line);
  };
  const select = (options, value, onPick) => {
    const sel = document.createElement('select');
    for (const [v, text] of options) sel.append(new Option(text, v));
    sel.value = value;
    sel.addEventListener('change', () => onPick(sel.value));
    return sel;
  };
  for (const [track, label] of Object.entries(midiOut.MIDI_TRACKS)) {
    const r = midiOut.route(track);
    const portOptions = [['', 'Son interne'], ...ports.map((o) => [o.id, o.name])];
    // Sortie choisie mais débranchée : on la garde dans la liste pour ne pas perdre le réglage.
    if (r.port && !ports.some((o) => o.id === r.port)) portOptions.push([r.port, '(débranché)']);
    const channels = Array.from({ length: 16 }, (_, i) => [String(i + 1), `Canal ${i + 1}`]);
    row(label,
      select(portOptions, r.port, (port) => midiOut.setRoute(track, { port })),
      select(channels, String(r.channel), (ch) => midiOut.setRoute(track, { channel: Number(ch) })));
  }
  const offset = document.createElement('input');
  offset.type = 'number';
  offset.min = -200;
  offset.max = 500;
  offset.step = 5;
  offset.value = midiOut.latency();
  offset.addEventListener('change', () => midiOut.setLatency(Number(offset.value) || 0));
  const unit = document.createElement('span');
  unit.textContent = 'ms';
  row('Décalage', offset, unit);
  note('Décalage : retarde les notes MIDI (valeur positive) ou les avance, pour les caler sur le son de l\'app.');
}
renderMidi();
midiOut.restoreMidi(renderMidi);

// Portée en clé de fa au-dessus de la tab : affichée par défaut, choix retenu sur l'appareil.
const STAFF_KEY = 'bassroutine-staff';
function setStaffVisible(on) {
  $('showStaff').checked = on;
  document.body.classList.toggle('with-staff', on);
  tab.setStaff(on);
  try { localStorage.setItem(STAFF_KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ }
}
$('showStaff').addEventListener('change', (e) => setStaffVisible(e.target.checked));

// Téléphone en paysage : la tab (et la portée) grandit pour remplir toute la hauteur sous l'en-tête.
// Agrandie d'un bloc (transform), le défilement et les clics gardent leurs coordonnées d'origine.
const LANDSCAPE = matchMedia('(orientation: landscape) and (max-height: 500px)');
function fitTab() {
  const panel = $('tabPanel'), labels = panel.querySelector('.tab-labels');
  panel.style.transform = panel.style.width = panel.style.height = panel.style.flex = '';
  if (!LANDSCAPE.matches) return;
  const pad = parseFloat(getComputedStyle(panel).paddingTop) + parseFloat(getComputedStyle(panel).paddingBottom);
  const room = innerHeight - document.querySelector('header').getBoundingClientRect().bottom;
  const k = Math.min(2.5, Math.max(1, room / (labels.offsetHeight + pad)));
  if (k <= 1.01) return;
  Object.assign(panel.style, {
    flex: 'none', transform: `scale(${k})`, transformOrigin: '0 0',
    width: `${innerWidth / k}px`, height: `${room / k}px`,
  });
}
LANDSCAPE.addEventListener('change', fitTab);
addEventListener('resize', fitTab);
new ResizeObserver(fitTab).observe(document.querySelector('#tabPanel .tab-labels'));

// Détail des mesures (grille de la boucle, grille d'accords, liste des gammes) : masqué par défaut.
const DETAIL_KEY = 'bassroutine-detail';
function setDetailVisible(on) {
  $('detail').hidden = !on;
  $('detailToggle').setAttribute('aria-expanded', on);
  $('detailToggle').textContent = on ? '▾ Masquer le détail des mesures' : '▸ Afficher le détail des mesures';
  try { localStorage.setItem(DETAIL_KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ }
}
$('detailToggle').addEventListener('click', () => setDetailVisible($('detail').hidden));
try { if (localStorage.getItem(DETAIL_KEY) === '1') setDetailVisible(true); } catch { /* stockage indisponible */ }

// Mode novice : altérations répétées sur chaque note de la portée (choix retenu sur l'appareil).
const EVERY_ACC_KEY = 'bassroutine-every-accidental';
function setEveryAccidental(on) {
  $('everyAcc').checked = on;
  tab.setEveryAccidental(on);
  try { localStorage.setItem(EVERY_ACC_KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ }
}
$('everyAcc').addEventListener('change', (e) => setEveryAccidental(e.target.checked));
try { if (localStorage.getItem(EVERY_ACC_KEY) === '1') setEveryAccidental(true); } catch { /* stockage indisponible */ }

// Doigtés sur tous les exercices (les gammes les affichent toujours) : choix retenu sur l'appareil.
const FINGERS_KEY = 'bassroutine-fingers';
function setFingersVisible(on) {
  $('showFingers').checked = on;
  tab.setFingers(on);
  try { localStorage.setItem(FINGERS_KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ }
}
$('showFingers').addEventListener('change', (e) => setFingersVisible(e.target.checked));
try { if (localStorage.getItem(FINGERS_KEY) === '1') setFingersVisible(true); } catch { /* stockage indisponible */ }

// Noms des notes : français ou américain (choix retenu sur l'appareil).
const NOTATION_KEY = 'bassroutine-notation';
function applyNotation(n) {
  setNotation(n);
  $('notation').value = n;
  try { localStorage.setItem(NOTATION_KEY, n); } catch { /* stockage indisponible */ }
  tab.redraw();
  showStringNames();
  if (mode === 'loop') renderLoopGrid();
  fillStringSets();
  if (mode === 'scale' || mode === 'finger') renderScales();
}
// Noms des cordes à gauche de la tab (Sol Ré La Mi, ou G D A E), dans la notation choisie.
function showStringNames() {
  const labels = document.querySelector('.tab-labels');
  labels.querySelectorAll(':scope > span').forEach((span, i) => { span.textContent = noteLabel(['Sol', 'Ré', 'La', 'Mi'][i]); });
  labels.classList.toggle('fr', getNotation() === 'fr');
}
$('notation').addEventListener('change', (e) => applyNotation(e.target.value));
// Au chargement on règle seulement la notation : les premiers affichages viennent après.
try { const n = localStorage.getItem(NOTATION_KEY); if (n) { setNotation(n); $('notation').value = n; } } catch { /* stockage indisponible */ }
showStringNames();

// Thème de couleurs (le script dans <head> l'applique déjà au chargement).
const THEME_KEY = 'bassroutine-theme';
function setTheme(name) {
  if (name) document.documentElement.dataset.theme = name;
  else delete document.documentElement.dataset.theme;
  // Barre du navigateur sur mobile : même couleur que le fond.
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  try { localStorage.setItem(THEME_KEY, name); } catch { /* stockage indisponible */ }
}
$('theme').value = document.documentElement.dataset.theme ?? '';
$('theme').addEventListener('change', (e) => setTheme(e.target.value));

// Panneau des réglages : fenêtre posée juste sous l'en-tête (visible même si la page a défilé).
function setSettingsOpen(open) {
  if (open) setTunerOpen(false);
  const panel = $('mixer');
  if (open) panel.style.top = `${document.querySelector('header').getBoundingClientRect().bottom + 6}px`;
  panel.hidden = !open;
  $('mixerBtn').setAttribute('aria-expanded', open);
}
// Onglets des réglages ; le dernier ouvert est retenu.
const SETTINGS_TAB_KEY = 'bassroutine-settings-tab';
const settingsTabs = [...document.querySelectorAll('.settings-tabs [role="tab"]')];
function showSettingsTab(name) {
  if (!settingsTabs.some((t) => t.dataset.tab === name)) name = 'display';
  for (const t of settingsTabs) {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
  }
  document.querySelectorAll('.settings-page').forEach((page) => { page.hidden = page.dataset.page !== name; });
  $('mixer').scrollTop = 0;
  try { localStorage.setItem(SETTINGS_TAB_KEY, name); } catch { /* stockage indisponible */ }
}
settingsTabs.forEach((t, i) => {
  t.addEventListener('click', () => showSettingsTab(t.dataset.tab));
  // Flèches gauche / droite : onglet voisin (accessibilité des onglets).
  t.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!k) return;
    const next = settingsTabs[(i + k + settingsTabs.length) % settingsTabs.length];
    showSettingsTab(next.dataset.tab);
    next.focus();
  });
});
try { showSettingsTab(localStorage.getItem(SETTINGS_TAB_KEY) ?? 'display'); } catch { showSettingsTab('display'); }

$('mixerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  setSettingsOpen($('mixer').hidden);
});
// Fermeture : clic en dehors du panneau, ou touche Échap.
document.addEventListener('click', (e) => {
  if (!$('mixer').hidden && !$('mixer').contains(e.target)) setSettingsOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('mixer').hidden) setSettingsOpen(false);
});

// ---------- Accordeur (pictogramme diapason) ----------
// Il écoute la même entrée audio que le mode attente : la lecture s'arrête à l'ouverture.
const tuner = createTuner($('tuner'), {
  async listen(onHear) {
    if (!(await wakeAudio(true))) throw new Error('audio');
    await pitch.openInput(Tone.getContext().rawContext, { onHear: (r) => onHear(r, pitch.inputSettings().threshold) });
  },
  stop: () => pitch.closeInput(),
});
function setTunerOpen(open) {
  const panel = $('tuner');
  if (open === !panel.hidden) return;
  $('tunerBtn').setAttribute('aria-expanded', open);
  if (!open) {
    panel.hidden = true;
    tuner.close();
    idleAudio();
    return;
  }
  setSettingsOpen(false);
  if (playing) stop();
  panel.style.top = `${document.querySelector('header').getBoundingClientRect().bottom + 6}px`;
  panel.hidden = false;
  tuner.open().catch((err) => {
    setTunerOpen(false);
    showMessage(`Pas d'accès au micro / à l'interface audio (${err.name}). Autorise-le dans le navigateur.`);
  });
}
$('tunerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  setTunerOpen($('tuner').hidden);
});
document.addEventListener('click', (e) => {
  if (!$('tuner').hidden && !$('tuner').contains(e.target)) setTunerOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setTunerOpen(false);
});
$('mixerReset').addEventListener('click', () => {
  $('mixerChannels').querySelectorAll('input').forEach((slider) => {
    slider.value = 100;
    slider.dispatchEvent(new Event('input'));
  });
});

// Saisie d'une ligne de basse au clavier MIDI (mode Morceau), gardée dans « Mes fichiers MIDI ».
// Heure du son de la touche : tout de suite (Tone.now() ajoute 0,1 s d'avance, perceptible au clavier),
// et jamais deux événements au même instant (Tone les refuse : accord, touches très rapides).
let lastPreview = 0;
const previewTime = () => (lastPreview = Math.max(Tone.immediate(), lastPreview + 0.002));
const recorder = createRecorder($('recorder'), {
  enable: () => midiOut.enableMidi(renderMidi),
  ports: () => (midiOut.midiReady() ? midiOut.inputs() : null),
  listen: midiOut.listenInputs,
  prepare: audioReady,
  noteOn: async (m) => {
    if (playing || !(await audioReady())) return;
    bass.triggerAttack(Tone.Frequency(m, 'midi'), previewTime(), 0.8);
  },
  noteOff: () => bass?.triggerRelease(previewTime()),
  click: (time, strong) => click.triggerAttackRelease(strong ? 'C6' : 'G5', '32n', time, strong ? 0.8 : 0.45),
  ctx: () => Tone.getContext().rawContext,
  tempo: () => Number($('tempo').value),
  name: (m) => noteLabel(pitchName(m, 0)) + String(Math.floor(m / 12) - 1).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]),
  onSave: async (file, title) => {
    try {
      const id = await library.addSong(file, title, 0);
      myMidi = await library.listSongs();
      useMidi(await readMidiFile(file), id, 0);
      setRecorderOpen(false);
    } catch (err) {
      showMessage(`Impossible d'enregistrer la ligne : ${err.message}`);
    }
  },
  onClose: () => setRecorderOpen(false),
});
function setRecorderOpen(open) {
  const panel = $('recorder');
  if (open === !panel.hidden) return;
  panel.hidden = !open;
  $('recordBtn').classList.toggle('on', open);
  if (open) {
    if (playing) stop();
    recorder.open();
  } else {
    recorder.close();
    idleAudio();
  }
}
$('recordBtn').addEventListener('click', () => setRecorderOpen($('recorder').hidden));

// Cliquer une mesure de la grille d'accords = repartir de là (premier chorus).
$('chart').addEventListener('click', (e) => {
  const cell = e.target.closest('.chart-bar');
  if (cell) seek(Number(cell.dataset.bar));
});

function setTempo(bpm) {
  bpm = Math.min(240, Math.max(30, bpm));
  $('tempo').value = bpm;
  $('tempoVal').textContent = `${bpm} BPM`;
  $('tempoHead').value = bpm;
  $('tempoHeadVal').textContent = bpm;
  if (bass) Tone.Transport.bpm.rampTo(transportBpm(), 0.1);
}
// Le tempo compte les temps de la mesure (noires pointées en 6/8 et 12/8) ; le transport, les noires.
function transportBpm() {
  return Number($('tempo').value) * (prog?.pulse ?? 1);
}
$('tempo').addEventListener('input', (e) => setTempo(Number(e.target.value)));
$('tempoHead').addEventListener('input', (e) => setTempo(Number(e.target.value)));
document.querySelectorAll('[data-bpm]').forEach((btn) =>
  btn.addEventListener('click', () => setTempo(Number($('tempo').value) + Number(btn.dataset.bpm))));

$('padSound').addEventListener('change', (e) => {
  if (!pad) return;
  pad.releaseAll();
  pad.dispose();
  pad.onDispose?.();
  pad = makePad(e.target.value);
});

for (const [id, s] of Object.entries(SCALE_TYPES)) $('scaleType').append(option(id, s.label, id === scaleState.type));
for (const [id, label] of Object.entries(FINGERINGS)) $('scaleFinger').append(option(id, label, id === scaleState.fingering));
for (const [id, label] of Object.entries(ZONES)) $('scaleZone').append(option(id, label, id === scaleState.zone));
updateKeySelect();
const scaleControl = (id, field, parse = (v) => v) => $(id).addEventListener('change', (e) => {
  if (playing) stop();
  chainPrev = null;
  scaleState[field] = parse(e.target.value);
  if (field === 'type' || field === 'fingering') updateKeySelect();   // noms de tonalités, boxes, menus visibles
  cue = 0;
  rangeStart = rangeEnd = null;
  renderScales();
});
scaleControl('scaleType', 'type');
scaleControl('scaleKey', 'key');
scaleControl('scaleRange', 'range');
scaleControl('scaleDir', 'direction');
scaleControl('scaleRhythm', 'rhythm', Number);
scaleControl('scaleFinger', 'fingering');
scaleControl('scaleZone', 'zone');
scaleControl('scaleBox', 'box');

// Déliateur : menus, et popup explicative à chaque nouvel exercice choisi.
for (const [id, ex] of Object.entries(EXERCISES)) $('fingerEx').append(option(id, ex.label, id === fingerState.exercise));
for (let f = 1; f <= 12; f++) $('fingerFret').append(option(String(f), `Case ${f}${f === 7 ? ' (milieu)' : ''}`, f === fingerState.fret));
for (const [id, label] of Object.entries(PROGRESSIONS)) $('fingerProg').append(option(id, label, id === fingerState.progression));
function fillStringSets() {
  $('fingerStrings').innerHTML = '';
  for (const [id, label] of Object.entries(STRING_SETS)) {
    $('fingerStrings').append(option(id, Array.isArray(label) ? label.map(noteLabel).join(' + ') : label, id === fingerState.strings));
  }
}
fillStringSets();
function updateFingerSelects() {
  const ex = EXERCISES[fingerState.exercise];
  if (ex.variants && !ex.variants[fingerState.variant]) fingerState.variant = ex.variant;
  $('fingerVariantCtl').hidden = !ex.variants;
  $('fingerVariant').innerHTML = '';
  for (const [id, label] of Object.entries(ex.variants ?? {})) $('fingerVariant').append(option(id, label, id === fingerState.variant));
  $('fingerDirCtl').hidden = !!ex.noReturn;
  $('fingerProgCtl').hidden = !!ex.positions;   // escalier et démanché ont leurs propres positions
}
updateFingerSelects();
const fingerTip = () => showFingerTip(fingerState.exercise, { base: fingerState.fret, variant: fingerState.variant });
const fingerControl = (id, field, parse = (v) => v) => $(id).addEventListener('change', (e) => {
  if (playing) stop();
  chainPrev = null;
  fingerState[field] = parse(e.target.value);
  if (field === 'exercise') updateFingerSelects();
  cue = 0;
  rangeStart = rangeEnd = null;
  renderScales();
  if ((field === 'exercise' || field === 'variant') && tipsWanted()) fingerTip();
});
fingerControl('fingerEx', 'exercise');
fingerControl('fingerVariant', 'variant');
fingerControl('fingerFret', 'fret', Number);
fingerControl('fingerStrings', 'strings');
fingerControl('fingerDir', 'direction');
fingerControl('fingerProg', 'progression');
fingerControl('fingerRhythm', 'rhythm', Number);
$('fingerInfo').addEventListener('click', fingerTip);
$('fingerLoop').addEventListener('change', refresh);
$('songLoop').addEventListener('change', refresh);
$('fingerChain').addEventListener('change', refresh);

$('mode').addEventListener('change', (e) => {
  setMode(e.target.value);
  if (mode === 'finger' && tipsWanted()) fingerTip();
});
$('bars').addEventListener('change', (e) => setBars(Number(e.target.value)));
// Autre mesure : la ligne est refaite (improvisation ou ligne toute prête) avec le bon nombre de temps.
$('meter').addEventListener('change', (e) => {
  loopState.meter = e.target.value;
  upcoming = chainPrev = null;
  cue = 0;   // les mesures n'ont plus la même longueur : on repart de la mesure 1
  rangeStart = rangeEnd = null;
  if ($('preset').value === 'invented') invent();
  else applyPreset($('preset').value);
  if (playing && !waiting) Tone.Transport.bpm.value = transportBpm();
});
$('loop').addEventListener('change', refresh);
// Enchaîner, ou réglages de l'improvisation changés : la suivante est préparée à nouveau.
for (const id of ['chain', 'randKey', 'randMode', 'randRegister']) {
  $(id).addEventListener('change', () => { upcoming = null; if (mode === 'loop') refresh(); });
}
$('scaleChain').addEventListener('change', refresh);
$('scaleLoop').addEventListener('change', refresh);
$('drumStyle').append(option('auto', 'Rythme auto', true));
for (const [id, label] of Object.entries(DRUM_STYLES)) $('drumStyle').append(option(id, label, false));
$('randKey').append(option('random', 'Tonalité au hasard', true));
for (const [value, label] of KEY_CHOICES) $('randKey').append(option(value, label, false));
$('invent').addEventListener('click', invent);
// Boucles écrites pour une mesure ou une longueur précise : on les règle en même temps.
$('preset').addEventListener('change', (e) => {
  const p = PRESETS[e.target.value];
  const meter = e.target.value in GROOVES ? p.meter ?? '4/4' : null;   // grooves : écrits pour leur mesure
  if (meter && meter !== loopState.meter) {
    loopState.meter = meter;
    $('meter').value = meter;
    cue = 0;
    rangeStart = rangeEnd = null;
    if (playing && !waiting) Tone.Transport.bpm.value = transportBpm();
  }
  if (p?.bars) {
    loopState.bars = p.bars;
    $('bars').value = String(p.bars);
  }
  applyPreset(e.target.value);
});

$('song').addEventListener('change', async (e) => {
  if (playing) stop();
  const id = libraryId(e.target.value);
  if (id != null) {
    if (!(await openLibrarySong(id))) {
      $('songInfo').textContent = 'Impossible de rouvrir ce fichier MIDI : réimportez-le.';
      await refreshLibrary();
    }
    return;
  }
  songState.songId = e.target.value;
  cue = 0;
  rangeStart = rangeEnd = null;
  setTempo(usingMidi() ? songState.midi.bpm : currentSong().bpm);
  // Chaque morceau propose sa ligne (walking, two-feel, bossa, croches).
  if (!usingMidi() && currentSong().style) {
    songState.style = currentSong().style;
    $('style').value = songState.style;
  }
  renderSong();
});
$('choruses').addEventListener('change', (e) => {
  songState.choruses = Number(e.target.value);
  renderSong();
});
for (const [id, label] of Object.entries(STYLES)) $('style').append(option(id, label, id === songState.style));
$('style').addEventListener('change', (e) => {
  songState.style = e.target.value;
  renderSong();
});
$('regen').addEventListener('click', () => {
  songState.seed++;
  renderSong();
});

$('midiFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const m = await readMidiFile(file);
    if (!m.tracks.length) throw new Error('aucune note dans ce fichier');
    // Gardé dans la bibliothèque pour le resélectionner plus tard (sinon : morceau de cette session seulement).
    let id = 0;
    try { id = await library.addSong(file, m.title, guessBassTrack(m.tracks)); } catch { /* stockage indisponible */ }
    if (id) myMidi = await library.listSongs().catch(() => myMidi);
    useMidi(m, id);
  } catch (err) {
    $('songInfo').textContent = `Impossible de lire ce fichier MIDI : ${err.message}`;
  }
  e.target.value = '';
});
$('forgetMidi').addEventListener('click', async () => {
  const id = libraryId(songState.songId);
  const title = songState.midi?.title ?? '';
  if (!id || !confirm(`Retirer « ${title} » de vos fichiers MIDI ?`)) return;
  if (playing) stop();
  await library.removeSong(id).catch(() => {});
  songState.midi = null;
  songState.songId = SONGS[0].id;
  cue = 0;
  rangeStart = rangeEnd = null;
  await refreshLibrary();
  setTempo(currentSong().bpm);
  renderSong();
});
$('track').addEventListener('change', (e) => {
  songState.track = Number(e.target.value);
  const id = libraryId(songState.songId);
  if (id) library.setSongTrack(id, songState.track).catch(() => {});
  renderSong();
});

// Barre d'espace = Play/Stop (sur ordinateur), même après un clic sur un bouton ou un menu ;
// seuls les champs de saisie gardent l'espace.
const typing = (el) => el.isContentEditable || el.tagName === 'TEXTAREA'
  || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'file'].includes(el.type));
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
  e.preventDefault();   // sinon l'espace « clique » aussi le bouton ou la case qui a le focus
  togglePlay();
});

// ---------- Mémoire des réglages d'une session à l'autre ----------
// Tout est gardé dans le stockage local du navigateur (sur l'appareil, rien n'est envoyé) :
// mode, tempo, cases cochées, menus, ligne de la boucle (même inventée ou modifiée), gammes, morceau.
// Les fichiers MIDI importés sont gardés à part, dans la bibliothèque (library.js).

const SETTINGS_KEY = 'bassroutine-settings';
const TOGGLES = ['synth', 'padHeld', 'drums', 'fills', 'metro', 'others', 'loop', 'chain', 'scaleLoop', 'scaleChain',
  'fingerLoop', 'fingerChain', 'songLoop', 'waitMode', 'gameMode'];
const SELECTS = ['padSound', 'drumStyle', 'randKey', 'randMode', 'randRegister', 'preset', 'bars', 'countIn'];
const SCALE_SELECTS = {
  scaleType: 'type', scaleKey: 'key', scaleRange: 'range', scaleDir: 'direction',
  scaleRhythm: 'rhythm', scaleFinger: 'fingering', scaleZone: 'zone', scaleBox: 'box',
};
const FINGER_SELECTS = {
  fingerEx: 'exercise', fingerVariant: 'variant', fingerFret: 'fret', fingerStrings: 'strings',
  fingerDir: 'direction', fingerRhythm: 'rhythm', fingerProg: 'progression',
};

function snapshot() {
  return {
    v: 1,
    mode,
    tempo: Number($('tempo').value),
    toggles: Object.fromEntries(TOGGLES.map((id) => [id, $(id).checked])),
    selects: Object.fromEntries(SELECTS.map((id) => [id, $(id).value])),
    loop: { ...loopState },
    loopInfo: inventedLabel,
    song: {
      songId: libraryId(songState.songId) ? songState.songId : usingMidi() ? SONGS[0].id : songState.songId,
      choruses: songState.choruses, seed: songState.seed, style: songState.style,
    },
    scale: { ...scaleState },
    finger: { ...fingerState },
  };
}

// Met une valeur dans un menu seulement si elle y existe encore.
function setSelect(id, value) {
  const sel = $(id);
  if ([...sel.options].some((o) => o.value === String(value))) sel.value = String(value);
}

function restoreSettings() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)); } catch { return false; }
  if (!saved || saved.v !== 1) return false;

  for (const [id, on] of Object.entries(saved.toggles ?? {})) if ($(id)) $(id).checked = on;
  for (const [id, value] of Object.entries(saved.selects ?? {})) if ($(id)) setSelect(id, value);

  if (saved.song) {
    const { songId, ...rest } = saved.song;
    Object.assign(songState, rest);
    if (SONGS.some((x) => x.id === songId)) songState.songId = songId;
    else if (libraryId(songId)) reopenMidi = { id: libraryId(songId), tempo: saved.tempo };
  }
  setSelect('choruses', songState.choruses);
  setSelect('style', songState.style);
  updateSongSelect();

  if (saved.scale) Object.assign(scaleState, saved.scale);
  updateKeySelect();
  for (const [id, field] of Object.entries(SCALE_SELECTS)) setSelect(id, scaleState[field]);
  if (saved.finger && saved.finger.exercise in EXERCISES) Object.assign(fingerState, saved.finger);
  if (fingerState.direction === 'up') fingerState.direction = 'down';   // ancien réglage « Montée »
  updateFingerSelects();
  for (const [id, field] of Object.entries(FINGER_SELECTS)) setSelect(id, fingerState[field]);

  const l = saved.loop;
  if (l && Array.isArray(l.bass) && l.bass.length === l.bars * meterOf(l).beats && l.chords?.length === l.bars) {
    // Sauvegarde d'avant l'armure : on la retrouve d'après la ligne inventée, ou d'après la ligne choisie.
    if (l.fifths == null) l.fifths = fifthsFromLabel(saved.loopInfo) ?? PRESETS[saved.selects?.preset]?.fifths ?? 0;
    Object.assign(loopState, { meter: '4/4' }, l);   // sauvegardes d'avant le choix de la mesure : 4/4
    setSelect('bars', l.bars);
    setSelect('meter', loopState.meter);
    renderLoopGrid();
  } else {
    applyPreset($('preset').value in PRESETS ? $('preset').value : 'mi');
  }
  if (saved.loopInfo && $('preset').value === 'invented') inventedLabel = saved.loopInfo;

  if (['loop', 'song', 'scale', 'finger'].includes(saved.mode)) {
    $('mode').value = saved.mode;
    setMode(saved.mode);
  }
  if (saved.tempo) setTempo(saved.tempo);   // après le mode, qui impose son tempo par défaut
  return true;
}

// Dernier morceau MIDI ouvert, rouvert une fois la bibliothèque lue (avec le tempo choisi).
let reopenMidi = null;
updateSongSelect();
if (!restoreSettings()) applyPreset('mi');
refreshLibrary().then(async () => {
  if (reopenMidi && myMidi.some((x) => x.id === reopenMidi.id) && (await openLibrarySong(reopenMidi.id)) && reopenMidi.tempo) {
    setTempo(reopenMidi.tempo);
  }
});
let staffOn = true;
try { staffOn = localStorage.getItem(STAFF_KEY) !== '0'; } catch { /* stockage indisponible */ }
setStaffVisible(staffOn);
showGameButton();   // case « 🎯 Jeu » retrouvée de la dernière visite

// Sauvegarde peu après chaque action (menus, cases, curseurs, boutons, grille).
let saveTimer;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(snapshot())); } catch { /* stockage indisponible */ }
  }, 300);
}
for (const type of ['change', 'input', 'click']) document.addEventListener(type, saveSoon);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js');
}
