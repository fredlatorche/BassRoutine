// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Saisie d'une ligne de basse au clavier MIDI, enregistrée comme fichier MIDI dans « Mes fichiers MIDI ».
// Deux façons de saisir :
// - Pas à pas : chaque touche ajoute une note de la durée choisie, sans contrainte de tempo.
// - Temps réel : décompte d'une mesure, on joue sur le métronome, les notes sont calées sur la grille.
// La ligne est une suite de notes et de silences { midi (null = silence), dur (en temps) }.

const KEY = 'bassroutine-recorder';
// Mesures proposées : [chiffrage, libellé]. Les durées sont comptées en noires ; en 6/8 et 12/8,
// le temps (clic du métronome, tempo) est une noire pointée.
const METERS = [['4/4', '4/4 (binaire)'], ['3/4', '3/4 (valse)'], ['6/8', '6/8 (ternaire)'], ['12/8', '12/8 (ternaire)']];
const meterInfo = (meter) => {
  const [num, den] = meter.split('/').map(Number);
  return { num, den, bpb: (num * 4) / den, pulse: den === 8 ? 1.5 : 1 };
};
const DURATIONS = [   // [temps, symbole, nom]
  [2, 'Blanche', 'Blanche'],   // (pas de symbole : absent de la plupart des polices)
  [1.5, '♩.', 'Noire pointée'],
  [1, '♩', 'Noire'],
  [0.5, '♪', 'Croche'],
  [0.25, '♬', 'Double croche'],
  [1 / 3, '♪³', 'Triolet de croches'],
];
const GRIDS = { 0.5: 'Croche', 0.25: 'Double croche', [1 / 3]: 'Triolet de croches' };
const OCTAVES = [[1, '+1 octave'], [0, 'Telle quelle'], [-1, '−1 octave'], [-2, '−2 octaves']];

// offset : retard (ms) entre le clic entendu et la touche reçue (son, clavier, réflexe), retiré des notes jouées.
const settings = { mode: 'step', dur: 1, grid: 0.5, octave: 0, offset: 0, meter: '4/4' };
const CALIBRATION_BEATS = 8;   // temps joués pour mesurer le retard
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* stockage indisponible */ }
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const durLabel = (d) => DURATIONS.find(([v]) => Math.abs(v - d) < 1e-6)?.[1] ?? `${+d.toFixed(2)} t`;

// Notes jouées en temps réel ({ t, end, midi } en temps) → suite de notes et silences calée sur la grille.
export function quantize(played, grid) {
  const snap = (x) => Math.round(x / grid) * grid;
  const notes = played
    .map((n) => ({ midi: n.midi, t: Math.max(0, snap(n.t)), end: snap(n.end) }))
    .sort((a, b) => a.t - b.t)
    .filter((n, i, all) => !all[i + 1] || all[i + 1].t - n.t > 1e-6);   // deux notes au même endroit : la dernière
  const items = [];
  let pos = 0;
  notes.forEach((n, i) => {
    if (n.t - pos > 1e-6) items.push({ midi: null, dur: n.t - pos });
    const next = notes[i + 1]?.t ?? Infinity;
    const end = Math.min(Math.max(n.end, n.t + grid), next);   // au moins un pas, sans chevaucher la suivante
    items.push({ midi: n.midi, dur: end - n.t });
    pos = end;
  });
  return items;
}

// Fichier MIDI (@tonejs/midi, globale Midi) d'une ligne : une piste « Basse », dans la mesure choisie.
// bpm : tempo en temps de la mesure (noires pointées en 6/8), écrit en noires dans le fichier.
export function lineToMidi(items, title, bpm, meter = '4/4') {
  const { num, den, pulse } = meterInfo(meter);
  const midi = new Midi();
  midi.name = title;
  midi.header.setTempo(bpm * pulse);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den] });
  midi.header.update();
  const track = midi.addTrack();
  track.name = 'Basse';
  track.instrument.number = 33;   // GM « basse électrique (doigts) »
  const ppq = midi.header.ppq;
  let t = 0;
  for (const { midi: m, dur } of items) {
    if (m != null) track.addNote({ midi: m, ticks: Math.round(t * ppq), durationTicks: Math.round(dur * ppq), velocity: 0.8 });
    t += dur;
  }
  return new File([midi.toArray()], `${title}.mid`, { type: 'audio/midi' });
}

// container : élément où dessiner la saisie. Fonctions fournies par l'app :
// enable() → '' ou message d'erreur (accès MIDI) ; ports() → claviers branchés ; listen(onNote, changed) ;
// prepare() réveille l'audio ; noteOn(midi) / noteOff() : son de la basse ; click(heure audio, temps fort) ;
// ctx() : contexte audio ; tempo() ; name(midi) : nom de note ; onSave(fichier, titre) ; onClose().
export function createRecorder(container, app) {
  let items = [];
  let live = null;   // enregistrement en cours : { downbeat, beat, held, played, timer, ... }
  let held = 0;      // note qui sonne (pas à pas)

  container.replaceChildren();
  const head = el('div', 'mixer-head');
  head.append(el('strong', null, '🎹 Saisie au clavier MIDI'));
  const modes = el('div', 'tuner-modes');
  const modeBtns = { step: el('button', null, 'Pas à pas'), live: el('button', null, 'Temps réel') };
  for (const [m, b] of Object.entries(modeBtns)) {
    b.addEventListener('click', () => { stopLive(); settings.mode = m; save(); render(); });
    modes.append(b);
  }
  const close = el('button', 'small', '✕');
  close.title = 'Fermer';
  close.addEventListener('click', () => app.onClose());
  head.append(modes, close);

  const ports = el('p', 'rec-ports');
  const allow = el('button', null, 'Autoriser le MIDI');
  allow.addEventListener('click', connect);

  const fields = el('div', 'rec-fields');
  const title = el('input');
  title.type = 'text';
  title.placeholder = 'Titre';
  title.setAttribute('aria-label', 'Titre du morceau');
  const octave = el('select');
  octave.setAttribute('aria-label', 'Octave');
  octave.title = 'Décale les notes du clavier (un petit clavier joue souvent trop haut pour la basse)';
  for (const [v, label] of OCTAVES) octave.append(new Option(label, v));
  octave.addEventListener('change', () => { settings.octave = Number(octave.value); save(); });
  const meter = el('select');
  meter.setAttribute('aria-label', 'Rythme');
  meter.title = 'Mesure de la ligne (métronome, décompte, barres de mesure)';
  for (const [v, label] of METERS) meter.append(new Option(label, v));
  meter.addEventListener('change', () => { stopLive(); settings.meter = meter.value; save(); render(); });
  fields.append(title, meter, octave);

  // Pas à pas : durée de la prochaine note, silence, effacer.
  const step = el('div', 'rec-step');
  const durBtns = DURATIONS.map(([v, sym, name]) => {
    const b = el('button', null, sym);
    b.title = name;
    b.addEventListener('click', () => { settings.dur = v; save(); render(); });
    step.append(b);
    return [v, b];
  });
  const rest = el('button', null, 'Silence');
  rest.addEventListener('click', () => add(null));
  const undo = el('button', null, '⌫');
  undo.title = 'Effacer la dernière note (touche Retour arrière)';
  undo.addEventListener('click', () => { items.pop(); render(); });
  step.append(rest, undo);

  // Temps réel : grille, bouton Enregistrer / Arrêter, décompte.
  const liveRow = el('div', 'rec-live');
  const grid = el('select');
  grid.setAttribute('aria-label', 'Calage des notes');
  for (const [v, label] of Object.entries(GRIDS)) grid.append(new Option(`Calage : ${label}`, v));
  grid.addEventListener('change', () => { settings.grid = Number(grid.value); save(); });
  const rec = el('button', 'rec-btn');
  rec.addEventListener('click', () => (live ? stopLive(true) : startLive()));
  const count = el('span', 'rec-count');
  liveRow.append(grid, rec, count);

  // Compensation du retard : réglage à la main, ou mesuré en jouant sur les clics.
  const latencyRow = el('div', 'rec-latency');
  const offset = el('input');
  offset.type = 'range';
  offset.min = -100;
  offset.max = 250;
  offset.step = 5;
  offset.setAttribute('aria-label', 'Compensation du retard');
  const offsetText = el('span', 'rec-offset');
  offset.addEventListener('input', () => { settings.offset = Number(offset.value); save(); render(); });
  const calibrate = el('button', null, 'Mesurer');
  calibrate.title = `Joue une note sur chacun des ${CALIBRATION_BEATS} clics après le décompte`;
  calibrate.addEventListener('click', () => (live ? stopLive() : startLive(true)));
  latencyRow.append(el('span', 'rec-latency-label', 'Retard'), offset, offsetText, calibrate);

  const line = el('div', 'rec-line');
  const summary = el('p', 'rec-summary');
  const actions = el('div', 'rec-actions');
  const clear = el('button', null, 'Tout effacer');
  clear.addEventListener('click', () => { stopLive(); items = []; render(); });
  const store = el('button', 'primary', '💾 Ajouter à mes fichiers MIDI');
  store.addEventListener('click', () => {
    stopLive(true);
    if (!items.some((x) => x.midi != null)) return;
    const name = title.value.trim() || defaultTitle();
    app.onSave(lineToMidi(items, name, app.tempo(), settings.meter), name);
    items = [];
    title.value = '';
    render();
  });
  actions.append(clear, store);

  container.append(head, ports, fields, step, liveRow, latencyRow, line, summary, actions);

  function defaultTitle() {
    const d = new Date();
    return `Ligne du ${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function add(midi) {
    items.push({ midi, dur: settings.dur });
    render();
  }

  function onNote(note, down, time) {
    const midi = note + 12 * settings.octave;
    if (midi < 0 || midi > 127) return;
    if (down) {
      app.noteOn(midi);
      held = midi;
      if (live) live.held.set(midi, live.pos(time));
      else if (settings.mode === 'step') add(midi);
    } else {
      if (held === midi) { app.noteOff(); held = 0; }
      if (live?.held.has(midi)) {
        live.played.push({ midi, t: live.held.get(midi), end: live.pos(time) });
        live.held.delete(midi);
      }
    }
  }

  // calibration : on ne garde pas de notes, on mesure l'écart moyen avec les clics.
  async function startLive(calibration = false) {
    if (!(await app.prepare())) return;
    const ctx = app.ctx();
    // Mesure jouée (la mesure du retard se fait sur des noires) ; beat : durée d'une noire en secondes.
    const { bpb, pulse } = calibration ? meterInfo('4/4') : meterInfo(settings.meter);
    const beat = 60 / (app.tempo() * pulse);
    const start = ctx.currentTime + 0.15;
    const downbeat = start + bpb * beat;   // après une mesure de décompte
    // Heure du clavier (performance.now, en ms) → position en temps depuis le premier temps.
    const latency = (ctx.outputLatency || ctx.baseLatency || 0);
    const perfAtDownbeat = performance.now() + (downbeat - ctx.currentTime + latency) * 1000;
    live = {
      held: new Map(),
      played: [],
      pos: (ms) => (ms - perfAtDownbeat - settings.offset) / 1000 / beat,
      next: 0,   // prochain clic à programmer (0 = premier temps du décompte), compté en temps de la mesure
      calibration,
      beat,
    };
    live.timer = setInterval(() => {
      while (start + live.next * pulse * beat < ctx.currentTime + 0.12) {
        app.click(start + live.next * pulse * beat, (live.next * pulse) % bpb < 1e-6);
        live.next++;
      }
      const now = (ctx.currentTime - downbeat) / beat;
      if (calibration) {
        if (now >= CALIBRATION_BEATS) return finishCalibration();
        count.textContent = now < 0 ? `${Math.ceil(-now)}…` : `Joue sur chaque clic (${CALIBRATION_BEATS - Math.floor(now)})`;
        return;
      }
      count.textContent = now < 0 ? `${Math.ceil(-now / pulse - 1e-6)}…` : `● Mesure ${Math.floor(now / bpb) + 1}`;
    }, 25);
    if (!calibration) items = [];
    render();
  }

  // Retard = écart médian entre les notes et le clic le plus proche, ajouté à la compensation actuelle.
  function finishCalibration() {
    const { beat } = live;
    const starts = [...live.played.map((n) => n.t), ...live.held.values()];
    const gaps = starts.filter((t) => t > -0.5).map((t) => t - Math.round(t)).sort((a, b) => a - b);
    stopLive();
    if (gaps.length < CALIBRATION_BEATS / 2) {
      count.textContent = 'Pas assez de notes : recommence en jouant sur chaque clic.';
      return;
    }
    const median = gaps[gaps.length >> 1];
    settings.offset = Math.max(-100, Math.min(250, Math.round((settings.offset + median * beat * 1000) / 5) * 5));
    save();
    render();
    count.textContent = `Retard mesuré : ${settings.offset} ms`;
  }

  // keep : garder ce qui a été joué (sinon on abandonne la prise).
  function stopLive(keep = false) {
    if (!live) return;
    clearInterval(live.timer);
    if (keep && !live.calibration) {
      const end = live.pos(performance.now());
      for (const [midi, t] of live.held) live.played.push({ midi, t, end });
      items = quantize(live.played.filter((n) => n.end > -0.25), settings.grid);
    }
    live = null;
    count.textContent = '';
    render();
  }

  function render() {
    for (const [m, b] of Object.entries(modeBtns)) b.classList.toggle('on', settings.mode === m);
    step.hidden = settings.mode !== 'step';
    liveRow.hidden = latencyRow.hidden = settings.mode !== 'live';
    offset.value = settings.offset;
    offsetText.textContent = `${settings.offset} ms`;
    calibrate.textContent = live?.calibration ? '■ Arrêter' : 'Mesurer';
    rec.disabled = !!live?.calibration;
    calibrate.disabled = !!live && !live.calibration;
    for (const [v, b] of durBtns) b.classList.toggle('on', Math.abs(v - settings.dur) < 1e-6);
    octave.value = String(settings.octave);
    grid.value = String(settings.grid);
    meter.value = settings.meter;
    const { bpb } = meterInfo(settings.meter);
    rec.textContent = live ? '■ Arrêter' : '● Enregistrer';
    rec.classList.toggle('on', !!live);

    const list = app.ports();
    ports.replaceChildren();
    if (list === null) ports.append('Le MIDI n\'est pas encore autorisé. ', allow);
    else if (!list.length) ports.textContent = 'Aucun clavier MIDI détecté : branche-le, il apparaîtra ici.';
    else ports.textContent = `Clavier : ${list.map((p) => p.name).join(', ')}`;

    line.replaceChildren();
    let t = 0;
    for (const { midi, dur } of items) {
      if (t > 0 && Math.abs(t / bpb - Math.round(t / bpb)) < 1e-6) line.append(el('span', 'rec-bar'));
      const chip = el('span', midi == null ? 'rec-note rest' : 'rec-note', midi == null ? '–' : app.name(midi));
      chip.append(el('small', null, durLabel(dur)));
      line.append(chip);
      t += dur;
    }
    if (!items.length) {
      line.append(el('span', 'rec-empty', settings.mode === 'step'
        ? 'Joue les notes une à une : chacune prend la durée choisie.'
        : `Touche Enregistrer : une mesure de décompte au tempo de l'app (${app.tempo()} BPM), puis joue.`));
    }
    const notes = items.filter((x) => x.midi != null).length;
    const bars = Math.ceil(t / bpb - 1e-6);
    summary.textContent = notes ? `${notes} note${notes > 1 ? 's' : ''} · ${bars} mesure${bars > 1 ? 's' : ''}` : '';
    store.disabled = !notes;
  }

  async function connect() {
    const error = await app.enable();
    if (error) ports.textContent = `Accès MIDI refusé : ${error}`;
    else render();
  }

  // Retour arrière = effacer la dernière note (hors champ de texte).
  function onKey(e) {
    if (e.key === 'Backspace' && e.target.tagName !== 'INPUT' && settings.mode === 'step' && items.length) {
      e.preventDefault();
      items.pop();
      render();
    }
  }

  return {
    async open() {
      render();
      app.listen(onNote, render);
      document.addEventListener('keydown', onKey);
      if (app.ports() === null) await connect();
    },
    close() {
      stopLive();
      app.listen(null);
      document.removeEventListener('keydown', onKey);
      if (held) { app.noteOff(); held = 0; }
    },
    stopLive,
  };
}
