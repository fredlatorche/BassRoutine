// Bass Routine : mode Boucle (grille éditable) et mode Morceau (walking générée ou MIDI importé),
// avec accords de synthé, métronome et tablature qui défile.

import { NAMES, LOW_E, parseChord, bassRoot, padVoicing } from './theory.js';
import { SONGS, expandSong } from './songs.js';
import { bassLine, STYLES } from './walking.js';
import { readMidiFile, guessBassTrack } from './midi-import.js';
import { createTab } from './tab.js';
import { createKit, patternHits, gmDrumEvents } from './drums.js';
import { SCALE_TYPES, FINGERINGS, ZONES, keyOptions, boxOptions, buildScaleExercise } from './scales.js';
import { inventLoop, KEY_CHOICES } from './random-loop.js';

const BEATS = 4;
const $ = (id) => document.getElementById(id);

// Notes proposées dans la grille, du Mi grave au Do de la case 17 sur G ;
// l'octave du dessus est marquée « aigu », la suivante « suraigu ».
const GRID_HIGH = 60;
const BASS_NOTES = [];
for (let m = LOW_E; m <= GRID_HIGH; m++) {
  BASS_NOTES.push({ midi: m, label: NAMES[m % 12] + (m >= LOW_E + 24 ? ' suraigu' : m >= LOW_E + 12 ? ' aigu' : '') });
}

const LOOP_CHORDS = ['Em', 'E', 'E7', 'Am', 'Am7', 'A', 'A7', 'D', 'D7', 'Dm7', 'G', 'Gmaj7', 'Gm7', 'C', 'Bm', 'B7'];

const PRESETS = {
  mi: {
    chords: ['Em'],
    bar: () => [LOW_E, LOW_E, LOW_E, LOW_E],
  },
  quinte: {
    chords: ['Em', 'Am', 'B7', 'Em'],
    bar: (c) => { const r = bassRoot(parseChord(c)); return [r, r + 7, r, r + 7]; },
  },
  walking: {
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
    chords: ['E7', 'E7', 'A7', 'A7', 'E7', 'E7', 'B7', 'A7'],
    lines: [
      [28, 32, 35, 37], [38, 37, 35, 32], [33, 37, 40, 37], [33, 31, 30, 29],
      [28, 32, 35, 37], [38, 37, 35, 34], [35, 39, 42, 34], [33, 31, 30, 29],
    ],
    drums: 'walking',
  },
  // ii-V-I en Sol avec retour par Mi7 : chaque mesure finit un demi-ton au-dessus de l'accord suivant.
  walking251: {
    chords: ['Am7', 'D7', 'Gmaj7', 'E7'],
    lines: [[33, 36, 40, 39], [38, 42, 45, 44], [43, 47, 45, 41], [40, 38, 35, 34]],
    drums: 'walking',
  },
  // Haut du manche en Ré mineur, lié et chantant, pensé pour la fretless :
  // cordes de D et G entre les cases 10 et 15 (positions imposées dans la tab).
  walkingHigh: {
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
};

let mode = 'loop';

const loopState = {
  bars: 8,
  chords: [],
  bass: [],   // une note MIDI (ou null = silence) par temps
  frets: [],  // position imposée dans la tab ([corde, case]) ou null, par temps
  legato: false,
  drums: 'eighths',
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
  $('loopInfo').hidden = true;
  loopState.chords = [];
  loopState.bass = [];
  loopState.frets = [];
  loopState.legato = !!p.legato;
  loopState.drums = p.drums ?? 'eighths';
  for (let b = 0; b < loopState.bars; b++) {
    const chord = p.chords[b % p.chords.length];
    const next = p.chords[(b + 1) % p.chords.length];
    loopState.chords.push(chord);
    loopState.bass.push(...(p.lines ? p.lines[b % p.lines.length] : p.bar(chord, next)));
    loopState.frets.push(...(p.frets ? p.frets[b % p.frets.length] : [null, null, null, null]));
  }
  renderLoopGrid();
}

// Mode aléatoire : grille et walking inventées dans la tonalité choisie (ou au hasard).
function invent() {
  const register = $('randRegister').value;
  const r = inventLoop({ key: $('randKey').value, mode: $('randMode').value, register, bars: loopState.bars });
  Object.assign(loopState, {
    chords: r.chords,
    bass: r.line,
    frets: r.line.map(() => null),
    legato: register === 'high',
    drums: 'walking',
  });
  $('preset').value = 'invented';
  $('loopInfo').textContent = `🎲 ${r.label}`;
  $('loopInfo').hidden = false;
  // C'est avec la nappe et la batterie que ça sonne : on les active.
  $('synth').checked = true;
  $('drums').checked = true;
  renderLoopGrid();
}

// Change le nombre de mesures en répétant le contenu existant.
function setBars(n) {
  const oldBars = loopState.bars;
  const chords = [], bass = [], frets = [];
  for (let b = 0; b < n; b++) {
    const src = b % oldBars;
    chords.push(loopState.chords[src]);
    bass.push(...loopState.bass.slice(src * BEATS, src * BEATS + BEATS));
    frets.push(...loopState.frets.slice(src * BEATS, src * BEATS + BEATS));
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
function makeProgram({ events, others = [], drums = null, drumStyle = 'eighths', chordBars = null, bars, bpb, labels }) {
  const totalBeats = bars * bpb;
  const bassEvents = trimLegato(events);
  const chordStarts = [];
  chordBars?.forEach((chords, b) => {
    const len = bpb / chords.length;
    chords.forEach((symbol, i) => { chordStarts[b * bpb + i * len] = { symbol, beats: len }; });
  });
  return {
    totalBeats,
    bpb,
    labels,
    bassEvents,
    bassByBeat: byBeat(bassEvents, totalBeats),
    otherByBeat: byBeat(others, totalBeats),
    drumByBeat: drums?.length ? byBeat(drums, totalBeats) : null,
    drumStyle,
    chordStarts,
  };
}

function buildLoopProgram() {
  const events = [];
  loopState.bass.forEach((midi, i) => {
    if (midi == null) return;
    const pos = loopState.frets[i];
    events.push({
      t: i, dur: loopState.legato ? 0.97 : 0.85, midi, vel: i % BEATS === 0 ? 0.9 : 0.75,
      ...(pos && { string: pos[0], fret: pos[1] }),
    });
  });
  return makeProgram({
    events,
    drumStyle: loopState.drums,
    chordBars: loopState.chords.map((c) => [c]),
    bars: loopState.bars,
    bpb: BEATS,
    labels: loopState.chords.map((_, b) => `Mesure ${b + 1}`),
  });
}

const currentSong = () => SONGS.find((s) => s.id === songState.songId);
const usingMidi = () => songState.songId === 'midi' && songState.midi;

function buildSongProgram() {
  if (usingMidi()) {
    const m = songState.midi;
    const bassTrack = m.tracks[songState.track];
    const others = m.tracks.filter((t, i) => i !== songState.track && !t.percussion).flatMap((t) => t.notes);
    const end = Math.max(...m.tracks.flatMap((t) => t.notes.map((n) => n.t + n.dur)));
    const bars = Math.max(1, Math.ceil(end / m.beatsPerBar));
    const drums = gmDrumEvents(m.tracks.filter((t) => t.percussion).flatMap((t) => t.notes));
    return makeProgram({
      events: bassTrack.notes,
      others,
      drums,
      bars,
      bpb: m.beatsPerBar,
      labels: Array.from({ length: bars }, (_, b) => `Mesure ${b + 1}/${bars}`),
    });
  }
  const bars = expandSong(currentSong(), songState.choruses);
  const perChorus = bars.length / songState.choruses;
  return makeProgram({
    events: bassLine(bars, songState.seed, songState.style),
    drumStyle: songState.style,
    chordBars: bars.map((b) => b.chords),
    bars: bars.length,
    bpb: BEATS,
    labels: bars.map((b, i) =>
      `Section ${b.section} · Mesure ${(i % perChorus) + 1}/${perChorus} · Chorus ${b.chorus}/${songState.choruses}`),
  });
}

// Point de départ de la lecture (en temps, toujours au début d'une mesure).
let cue = 0;

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

function buildScaleProgram() {
  const ex = buildScaleExercise(scaleState);
  scaleKeys = ex.keys;
  return makeProgram({
    events: ex.events,
    chordBars: ex.chordBars,
    bars: ex.bars,
    bpb: BEATS,
    labels: ex.labels,
  });
}

const tab = createTab($('tab'), { onSeek: (beat) => seek(Math.floor(beat / prog.bpb)) });

function refresh() {
  prog = mode === 'loop' ? buildLoopProgram() : mode === 'song' ? buildSongProgram() : buildScaleProgram();
  tab.render(prog.bassEvents, prog.totalBeats, prog.bpb);
  if (cue >= prog.totalBeats) cue = 0;
  tab.setCue(cue);
}

// Se placer au début d'une mesure ; pendant la lecture, on y saute tout de suite.
function seek(bar) {
  const bars = prog.totalBeats / prog.bpb;
  cue = Math.min(Math.max(0, bar), bars - 1) * prog.bpb;
  tab.setCue(cue);
  if (playing) {
    step = cue;
    bass.triggerRelease();
    pad.releaseAll();
    other.releaseAll();
  } else {
    showCue();
    tab.follow(null);   // fait défiler la tab jusqu'au repère
  }
}

function showCue() {
  $('position').textContent = cue === 0
    ? 'Mesure – · Temps –'
    : `Départ : ${prog.labels[cue / prog.bpb]}`;
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
    for (let t = 0; t < BEATS; t++) {
      const i = b * BEATS + t;
      const sel = document.createElement('select');
      sel.dataset.step = i;
      sel.append(option('', '—', loopState.bass[i] == null));
      for (const n of BASS_NOTES) sel.append(option(n.midi, n.label, n.midi === loopState.bass[i]));
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
  $('regen').hidden = midi;
  $('midiCtl').hidden = !midi;
}

function updateSongSelect() {
  const sel = $('song');
  sel.innerHTML = '';
  for (const s of SONGS) sel.append(option(s.id, s.title, s.id === songState.songId));
  if (songState.midi) sel.append(option('midi', `MIDI : ${songState.midi.title}`, songState.songId === 'midi'));
}

function setMode(m) {
  if (playing) stop();
  mode = m;
  cue = 0;
  $('loopControls').hidden = mode !== 'loop';
  $('songControls').hidden = mode !== 'song';
  $('scaleControls').hidden = mode !== 'scale';
  grid.hidden = mode !== 'loop';
  $('songView').hidden = mode !== 'song';
  $('scaleView').hidden = mode !== 'scale';
  if (mode === 'loop') {
    refresh();
  } else if (mode === 'song') {
    if (!usingMidi()) setTempo(currentSong().bpm);
    renderSong();
  } else {
    setTempo(80);
    renderScales();
  }
}

// Gammes : une ligne par tonalité avec ses notes ; un clic sur la ligne repart de là.
function renderScales() {
  refresh();
  const view = $('scaleList');
  view.innerHTML = '';
  for (const k of scaleKeys) {
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
      chip.textContent = n;
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
  if (s == null) {
    showCue();
    return;
  }
  const bar = Math.floor(s / prog.bpb);
  $('position').textContent = `${prog.labels[bar]} · Temps ${(s % prog.bpb) + 1}`;
  const els = mode === 'loop'
    ? [grid.querySelector(`[data-step="${s}"]`)]
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
};

const makePad = (kind) => (PAD_SOUNDS[kind] ?? PAD_SOUNDS.epiano)(reverb);

// Appelé à chaque temps : joue tous les événements qui tombent dans ce temps.
function tick(time) {
  if (step >= prog.totalBeats) {
    const looping = (mode === 'loop' && $('loop').checked) || (mode === 'scale' && $('scaleLoop').checked);
    if (!looping) {
      Tone.Transport.stop(time);
      Tone.Draw.schedule(stopUI, time);
      return;
    }
    step = 0;
  }
  const s = step++;
  const beat = s % prog.bpb;
  const beatDur = 60 / Tone.Transport.bpm.value;
  const at = (e) => time + (e.t - s) * beatDur;

  for (const e of prog.bassByBeat[s] ?? []) {
    bass.triggerAttackRelease(Tone.Frequency(e.midi, 'midi'), e.dur * beatDur, at(e), e.vel ?? 0.8);
  }
  if ($('others').checked) {
    for (const e of prog.otherByBeat[s] ?? []) {
      other.triggerAttackRelease(Tone.Frequency(e.midi, 'midi'), e.dur * beatDur, at(e), e.vel ?? 0.6);
    }
  }
  const chord = prog.chordStarts[s];
  if ($('synth').checked && chord) {
    const notes = padVoicing(parseChord(chord.symbol)).map((m) => Tone.Frequency(m, 'midi'));
    pad.triggerAttackRelease(notes, chord.beats * beatDur * 0.95, time, 0.5);
  }
  if ($('drums').checked) {
    const hits = prog.drumByBeat ? prog.drumByBeat[s] ?? [] : patternHits(prog.drumStyle, s, prog.bpb);
    for (const h of hits) kit.play(h, at(h));
    if (s === 0 && !prog.drumByBeat) kit.play({ d: 'crash', v: 0.6 }, time);
  }
  if ($('metro').checked) {
    click.triggerAttackRelease(beat === 0 ? 'C6' : 'G5', '32n', time, beat === 0 ? 0.8 : 0.45);
  }
  Tone.Draw.schedule(() => {
    beatClock = { s, time };
    showBeat(s);
  }, time);
}

function frame() {
  if (!playing) return;
  if (beatClock) {
    const beatDur = 60 / Tone.Transport.bpm.value;
    const frac = Math.min(1, Math.max(0, (Tone.context.currentTime - beatClock.time) / beatDur));
    tab.follow(beatClock.s + frac);
  }
  requestAnimationFrame(frame);
}

async function start() {
  // iOS 17+ : joue même si le bouton silencieux est activé.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  await Tone.start();
  if (!bass) initAudio();
  Tone.Transport.bpm.value = Number($('tempo').value);
  step = cue;
  beatClock = null;
  Tone.Transport.start('+0.05');
  playing = true;
  $('play').textContent = '■ Stop';
  requestAnimationFrame(frame);
}

function stop() {
  Tone.Transport.stop();
  bass?.triggerRelease();
  pad?.releaseAll();
  other?.releaseAll();
  stopUI();
}

function stopUI() {
  playing = false;
  beatClock = null;
  $('play').textContent = '▶ Play';
  showBeat(null);
  tab.follow(null);
}

// ---------- Contrôles ----------

$('play').addEventListener('click', () => (playing ? stop() : start()));

renderMixer();
$('mixerBtn').addEventListener('click', () => {
  const open = $('mixer').hidden;
  $('mixer').hidden = !open;
  $('mixerBtn').setAttribute('aria-expanded', open);
});
$('mixerReset').addEventListener('click', () => {
  $('mixerChannels').querySelectorAll('input').forEach((slider) => {
    slider.value = 100;
    slider.dispatchEvent(new Event('input'));
  });
});
$('rewind').addEventListener('click', () => seek(0));

// Cliquer une mesure de la grille d'accords = repartir de là (premier chorus).
$('chart').addEventListener('click', (e) => {
  const cell = e.target.closest('.chart-bar');
  if (cell) seek(Number(cell.dataset.bar));
});

function setTempo(bpm) {
  bpm = Math.min(240, Math.max(40, bpm));
  $('tempo').value = bpm;
  $('tempoVal').textContent = `${bpm} BPM`;
  if (bass) Tone.Transport.bpm.rampTo(bpm, 0.1);
}
$('tempo').addEventListener('input', (e) => setTempo(Number(e.target.value)));
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
  scaleState[field] = parse(e.target.value);
  if (field === 'type' || field === 'fingering') updateKeySelect();   // noms de tonalités, boxes, menus visibles
  cue = 0;
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

$('mode').addEventListener('change', (e) => setMode(e.target.value));
$('bars').addEventListener('change', (e) => setBars(Number(e.target.value)));
$('randKey').append(option('random', 'Tonalité au hasard', true));
KEY_CHOICES.forEach((k, pc) => $('randKey').append(option(pc, k, false)));
$('invent').addEventListener('click', invent);
$('preset').addEventListener('change', (e) => applyPreset(e.target.value));

$('song').addEventListener('change', (e) => {
  if (playing) stop();
  songState.songId = e.target.value;
  cue = 0;
  setTempo(usingMidi() ? songState.midi.bpm : currentSong().bpm);
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
    if (playing) stop();
    songState.midi = m;
    songState.track = guessBassTrack(m.tracks);
    songState.songId = 'midi';
    cue = 0;
    const trackSel = $('track');
    trackSel.innerHTML = '';
    m.tracks.forEach((t, i) => trackSel.append(option(i, `${t.name}${t.percussion ? ' (batterie)' : ''}`, i === songState.track)));
    updateSongSelect();
    setTempo(m.bpm);
    renderSong();
  } catch (err) {
    $('songInfo').textContent = `Impossible de lire ce fichier MIDI : ${err.message}`;
  }
  e.target.value = '';
});
$('track').addEventListener('change', (e) => {
  songState.track = Number(e.target.value);
  renderSong();
});

// Barre d'espace = Play/Stop (sur ordinateur).
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['SELECT', 'BUTTON', 'INPUT'].includes(e.target.tagName)) {
    e.preventDefault();
    playing ? stop() : start();
  }
});

updateSongSelect();
applyPreset('mi');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js');
}
