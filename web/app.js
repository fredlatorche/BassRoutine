// Basse Tools : mode Boucle (grille éditable) et mode Morceau (walking générée ou MIDI importé),
// avec accords de synthé, métronome et tablature qui défile.

import { NAMES, LOW_E, HIGH, parseChord, bassRoot, padVoicing } from './theory.js';
import { SONGS, expandSong } from './songs.js';
import { bassLine, STYLES } from './walking.js';
import { readMidiFile, guessBassTrack } from './midi-import.js';
import { createTab } from './tab.js';
import { createKit, patternHits, gmDrumEvents } from './drums.js';

const BEATS = 4;
const $ = (id) => document.getElementById(id);

// Notes proposées dans la grille ; l'octave du dessus est marquée « aigu ».
const BASS_NOTES = [];
for (let m = LOW_E; m <= HIGH; m++) {
  BASS_NOTES.push({ midi: m, label: NAMES[m % 12] + (m >= LOW_E + 12 ? ' aigu' : '') });
}

const LOOP_CHORDS = ['Em', 'E', 'E7', 'Am', 'A', 'A7', 'D', 'G', 'C', 'Bm', 'B7'];

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
};

let mode = 'loop';

const loopState = {
  bars: 8,
  chords: [],
  bass: [],   // une note MIDI (ou null = silence) par temps
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
  loopState.chords = [];
  loopState.bass = [];
  for (let b = 0; b < loopState.bars; b++) {
    const chord = p.chords[b % p.chords.length];
    const next = p.chords[(b + 1) % p.chords.length];
    loopState.chords.push(chord);
    loopState.bass.push(...p.bar(chord, next));
  }
  renderLoopGrid();
}

// Change le nombre de mesures en répétant le contenu existant.
function setBars(n) {
  const oldBars = loopState.bars;
  const chords = [], bass = [];
  for (let b = 0; b < n; b++) {
    const src = b % oldBars;
    chords.push(loopState.chords[src]);
    bass.push(...loopState.bass.slice(src * BEATS, src * BEATS + BEATS));
  }
  Object.assign(loopState, { bars: n, chords, bass });
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
    if (midi != null) events.push({ t: i, dur: 0.85, midi, vel: i % BEATS === 0 ? 0.9 : 0.75 });
  });
  return makeProgram({
    events,
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

const tab = createTab($('tab'), { onSeek: (beat) => seek(Math.floor(beat / prog.bpb)) });

function refresh() {
  prog = mode === 'loop' ? buildLoopProgram() : buildSongProgram();
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
    for (const c of LOOP_CHORDS) chordSel.append(option(c, c, c === loopState.chords[b]));
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
  const loop = mode === 'loop';
  $('loopControls').hidden = !loop;
  $('songControls').hidden = loop;
  grid.hidden = !loop;
  $('songView').hidden = loop;
  if (loop) {
    refresh();
  } else {
    if (!usingMidi()) setTempo(currentSong().bpm);
    renderSong();
  }
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
    : [chart.querySelector(`[data-bar="${usingMidi() ? bar : bar % chart.children.length}"]`)];
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

function initAudio() {
  bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 2 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.15 },
    filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2, baseFrequency: 120, octaves: 2.5 },
    volume: -6,
  }).toDestination();

  reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
  pad = makePad($('padSound').value);
  kit = createKit();

  other = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
    volume: -16,
  }).toDestination();

  click = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    volume: -16,
  }).toDestination();

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
    if (!(mode === 'loop' && $('loop').checked)) {
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

$('mode').addEventListener('change', (e) => setMode(e.target.value));
$('bars').addEventListener('change', (e) => setBars(Number(e.target.value)));
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
