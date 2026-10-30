// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Sortie MIDI (Web MIDI : Chrome, Edge, Firefox sur ordinateur ; ni Safari ni iPhone).
// Chaque piste (basse, accords, batterie, autres) peut jouer sur un instrument MIDI au lieu
// du son interne : un synthé branché en USB, ou Ableton / GarageBand via le bus IAC du Mac.
// Les notes partent avec un horodatage calé sur l'horloge audio, donc en rythme avec le reste.
// Entrée : les claviers MIDI branchés servent à saisir une ligne de basse (recorder.js).

export const MIDI_TRACKS = {
  bass: 'Basse',
  pad: 'Accords',
  drums: 'Batterie',
  other: 'Autres pistes (MIDI)',
};
const DEFAULT_CHANNEL = { bass: 1, pad: 2, drums: 10, other: 3 };
const KEY = 'bassroutine-midi';

// Nos fûts -> notes de batterie General MIDI (canal 10 ; comprises par les kits d'Ableton et de GarageBand).
const GM_DRUMS = { kick: 36, rim: 37, snare: 38, clap: 39, hat: 42, pedal: 44, openhat: 46, crash: 49, ride: 51, brush: 38 };
const GM_TOMS = { G2: 41, A2: 43, C3: 45, D3: 47, E3: 48, G3: 50 };
const DRUM_LENGTH = 0.1;   // durée d'un coup (s) : la note off suit de peu

// routes[piste] = { port: id de la sortie ('' = son interne), channel: 1 à 16 } ; offset : décalage en ms.
const settings = {
  routes: Object.fromEntries(Object.keys(MIDI_TRACKS).map((k) => [k, { port: '', channel: DEFAULT_CHANNEL[k] }])),
  offset: 0,
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  Object.assign(settings.routes, saved.routes);
  settings.offset = Number(saved.offset) || 0;
} catch { /* stockage indisponible */ }
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
};

let access = null;
let lastOn = 0;   // heure (performance.now) de la dernière note programmée
let onChange = () => {};

export const midiSupported = () => typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
export const midiReady = () => !!access;
export const outputs = () => (access ? [...access.outputs.values()] : []);

// Une piste joue-t-elle en MIDI (port choisi et branché) ?
function output(track) {
  const port = settings.routes[track]?.port;
  return port && access ? access.outputs.get(port) ?? null : null;
}
export const routedToMidi = (track) => !!output(track);

// Demande l'accès MIDI (le navigateur pose la question la première fois).
// Renvoie '' si c'est bon, sinon le message d'erreur du navigateur.
export async function enableMidi(changed) {
  if (changed) onChange = changed;
  if (access) return '';
  if (!midiSupported()) return 'Web MIDI absent de ce navigateur';
  try {
    access = await navigator.requestMIDIAccess();
  } catch (err) {
    return err?.message || err?.name || String(err);
  }
  access.onstatechange = () => { bindInputs(); onChange(); inputsChanged(); };   // instrument branché ou débranché
  bindInputs();
  onChange();
  return '';
}

// ---------- Entrée : claviers MIDI (saisie d'une ligne de basse) ----------

export const inputs = () => (access ? [...access.inputs.values()] : []);
let onInputNote = null, inputsChanged = () => {};
function bindInputs() {
  for (const port of inputs()) {
    port.onmidimessage = onInputNote && ((e) => {
      const [status, note, vel] = e.data;
      const type = status & 0xf0;
      if (type === 0x90 && vel > 0) onInputNote(note, true, e.timeStamp);
      else if (type === 0x80 || type === 0x90) onInputNote(note, false, e.timeStamp);
    });
  }
}
// Écoute tous les claviers : onNote(note, appuyée, heure performance.now), changed() quand on en branche un.
// listenInputs(null) arrête l'écoute.
export function listenInputs(onNote, changed) {
  onInputNote = onNote;
  inputsChanged = changed ?? (() => {});
  bindInputs();
}

// Déjà autorisé lors d'une visite précédente et une piste routée : on se reconnecte sans rien demander.
export async function restoreMidi(changed) {
  if (!midiSupported() || !Object.values(settings.routes).some((r) => r.port)) return;
  try {
    const state = await navigator.permissions?.query({ name: 'midi' });
    if (state && state.state !== 'granted') return;
  } catch { /* permission « midi » inconnue de ce navigateur : on tente quand même */ }
  await enableMidi(changed);
}

export const route = (track) => settings.routes[track];
export function setRoute(track, change) {
  Object.assign(settings.routes[track], change);
  save();
}
export const latency = () => settings.offset;
export function setLatency(ms) {
  settings.offset = ms;
  save();
}

// Heure audio (Tone / Web Audio) -> heure de performance.now(), comme le son interne sort des haut-parleurs.
function stamp(audioTime, ctx) {
  const out = ctx.getOutputTimestamp?.();
  const ms = out?.performanceTime
    ? out.performanceTime + (audioTime - out.contextTime) * 1000
    : performance.now() + (audioTime - ctx.currentTime) * 1000;
  return Math.max(performance.now(), ms + settings.offset);
}

function noteOnOff(port, channel, midi, vel, start, end) {
  const ch = channel - 1;
  const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
  port.send([0x90 | ch, midi, v], start);
  port.send([0x80 | ch, midi, 0], end);
  lastOn = Math.max(lastOn, start);
}

// Joue une ou plusieurs notes (numéros MIDI) sur la piste ; ctx : contexte audio brut.
export function playNotes(track, notes, dur, audioTime, vel, ctx) {
  const port = output(track);
  if (!port) return;
  const start = stamp(audioTime, ctx);
  // Note off un peu avant la durée : une même note rejouée juste après n'est pas coupée.
  const end = start + Math.max(10, dur * 1000 - 5);
  for (const midi of [].concat(notes)) noteOnOff(port, settings.routes[track].channel, midi, vel, start, end);
}

// Un coup de batterie ({ d, v, note } comme pour le kit interne).
export function playDrum(hit, audioTime, ctx) {
  const port = output('drums');
  const midi = hit.d === 'tom' ? GM_TOMS[hit.note] ?? 45 : GM_DRUMS[hit.d];
  if (!port || !midi) return;
  const start = stamp(audioTime, ctx);
  const vel = hit.d === 'brush' ? hit.v * 0.5 : hit.v;
  noteOnOff(port, settings.routes.drums.channel, midi, vel ?? 0.8, start, start + DRUM_LENGTH * 1000);
}

// Stop : coupe tout ce qui sonne, puis recommence juste après la dernière note déjà programmée
// (Chrome ne sait pas annuler un message déjà envoyé avec un horodatage).
export function silence() {
  const ports = new Set(Object.keys(MIDI_TRACKS).map(output).filter(Boolean));
  const later = lastOn > performance.now();
  for (const port of ports) {
    port.clear?.();
    for (const [track, r] of Object.entries(settings.routes)) {
      if (output(track) !== port) continue;
      const allOff = [0xb0 | (r.channel - 1), 123, 0];
      port.send(allOff);
      if (later) port.send(allOff, lastOn + 5);
    }
  }
}
