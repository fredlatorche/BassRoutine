// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Entrée audio (basse dans l'interface audio, ou micro) et reconnaissance de la note jouée,
// pour le mode « Attendre ma note ».
// Hauteur : méthode de McLeod (NSDF), qui évite les erreurs d'octave fréquentes à la basse
// (fondamentale faible, harmoniques fortes). Une note est « reconnue » quand elle est stable
// quelques analyses de suite ; la même note rejouée est reconnue à sa nouvelle attaque.

const MIN_HZ = 35;     // un peu sous le Mi grave (41 Hz)
const MAX_HZ = 700;    // haut du manche, avec de la marge
const CLARITY = 0.85;  // en dessous : bruit, pas une note
const STABLE = 3;      // analyses identiques de suite pour valider une note
const PERIOD = 25;     // ms entre deux analyses
const KEY = 'bassroutine-input';

// Hauteur d'un bloc d'échantillons. Renvoie { hz, clarity, rms } (hz = 0 si rien de net).
export function detectPitch(buf, sampleRate) {
  // On divise la fréquence d'échantillonnage par 2 (moyenne de deux échantillons) : assez pour la basse,
  // et 4 fois moins de calcul.
  const step = sampleRate > 30000 ? 2 : 1;
  const sr = sampleRate / step;
  const n = Math.floor(buf.length / step);
  const x = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = 0; k < step; k++) v += buf[i * step + k];
    x[i] = v / step;
    sum += x[i] * x[i];
  }
  const rms = Math.sqrt(sum / n);
  const maxLag = Math.min(Math.floor(sr / MIN_HZ), Math.floor(n / 2));
  const minLag = Math.floor(sr / MAX_HZ);
  const w = n - maxLag;   // fenêtre de comparaison
  if (w < maxLag || rms < 1e-4) return { hz: 0, clarity: 0, rms };

  // NSDF : 2·r(τ) / m(τ), entre -1 et 1 ; vaut 1 quand le signal se répète exactement après τ.
  const nsdf = new Float32Array(maxLag + 1);
  for (let tau = 0; tau <= maxLag; tau++) {
    let r = 0, m = 0;
    for (let j = 0; j < w; j++) {
      const a = x[j], b = x[j + tau];
      r += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = m > 0 ? (2 * r) / m : 0;
  }

  // Maxima de chaque zone positive ; on prend le premier assez proche du plus haut (évite l'octave en dessous).
  const peaks = [];
  let tau = 0;
  while (tau < maxLag && nsdf[tau] > 0) tau++;   // on sort de la zone positive autour de 0
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++;
    let best = tau;
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > nsdf[best]) best = tau;
      tau++;
    }
    if (best >= minLag && best < maxLag && nsdf[best] > 0) peaks.push(best);
  }
  if (!peaks.length) return { hz: 0, clarity: 0, rms };
  const top = Math.max(...peaks.map((p) => nsdf[p]));
  const p = peaks.find((q) => nsdf[q] >= 0.9 * top);

  // Interpolation parabolique autour du pic : précision au-delà de l'échantillon.
  const a = nsdf[p - 1], b = nsdf[p], c = nsdf[p + 1] ?? b;
  const shift = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
  return { hz: sr / (p + shift), clarity: b, rms };
}

export const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);

// Suivi des notes : reçoit une analyse par appel. Tant qu'une note stable sonne, renvoie
// { pitch, midi, attack } : pitch = hauteur précise (69 = La 440, 69.1 = 10 cents plus haut),
// midi = note la plus proche, attack = vrai à la première analyse d'une note nouvellement jouée.
// threshold : niveau (RMS) minimal d'une note jouée.
export function createTracker(threshold = 0.01) {
  let candidate = null, count = 0, last = null, armed = true;
  const recent = [];   // dernières hauteurs de la note stable (moyenne : moins de tremblement)
  // Après une note : on suit son niveau ; une nouvelle attaque = niveau retombé puis nettement remonté.
  // (Pendant l'attaque, la fenêtre d'analyse se remplit et le niveau monte encore : ce n'est pas une attaque.)
  let peak = 0, dipped = false, low = Infinity;
  // Juste après une attaque, la fenêtre d'analyse contient encore la fin de la note précédente :
  // la même hauteur n'est acceptée qu'une fois la fenêtre remplie par la nouvelle note.
  let sinceAttack = Infinity;
  const FILL = 5;
  return {
    setThreshold(t) { threshold = t; },
    push({ hz, clarity, rms }) {
      sinceAttack++;
      if (rms < threshold * 0.5) { armed = true; sinceAttack = Infinity; }   // silence : tout est permis
      if (!armed) {
        if (!dipped) {
          peak = Math.max(peak, rms);
          if (rms < peak * 0.7) { dipped = true; low = rms; }
        } else {
          low = Math.min(low, rms);
          if (rms > threshold && rms > low * 1.5) { armed = true; sinceAttack = 0; }
        }
      }
      const voiced = hz > 0 && clarity >= CLARITY && rms > threshold;
      if (!voiced) { candidate = null; count = 0; recent.length = 0; return null; }
      // Stabilité jugée sur la hauteur précise (à 30 cents près) : une note de fretless entre deux
      // demi-tons ne « clignote » pas d'une note à l'autre.
      const p = hzToMidi(hz);
      if (candidate != null && Math.abs(p - candidate) < 0.3) count++;
      else { count = 1; recent.length = 0; }
      candidate = p;
      recent.push(p);
      if (recent.length > 4) recent.shift();
      if (count < STABLE) return null;
      const pitch = recent.reduce((x, y) => x + y, 0) / recent.length;
      const midi = Math.round(pitch);
      // Nouvelle note : autre hauteur (même liée), ou même hauteur rejouée (nouvelle attaque).
      const attack = midi !== last || (armed && sinceAttack >= FILL);
      if (attack) {
        last = midi;
        armed = false;
        peak = rms;
        dipped = false;
      }
      return { pitch, midi, attack };
    },
  };
}

// ---------- Entrée audio ----------

// Justesse demandée : écart maximal (en cents) entre la note jouée et la note attendue.
export const TOLERANCES = {
  50: 'Large (± 50 cents : la note la plus proche)',
  25: 'Moyen (± 25 cents)',
  12: 'Précis (± 12 cents) — recommandé',
  6: 'Très précis (± 6 cents)',
};
const settings = { device: '', threshold: 0.01, tolerance: 12 };   // Précis par défaut
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* stockage indisponible */ }
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
};
export const inputSettings = () => ({ ...settings });
export function setInput(change) {
  Object.assign(settings, change);
  save();
  tracker?.setThreshold(settings.threshold);
}

export const inputSupported = () => !!navigator.mediaDevices?.getUserMedia;

// Entrées audio disponibles (noms visibles une fois l'accès autorisé).
export async function listInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'audioinput');
}

let stream = null, source = null, analyser = null, timer = null, tracker = null, lastRms = 0;

// Ouvre l'entrée et appelle onNote({ pitch, midi, attack }) tant qu'une note stable sonne,
// onHear(analyse) à chaque analyse.
// ctx : contexte audio (celui de Tone). Lève une erreur si l'accès est refusé.
export async function openInput(ctx, { onNote, onHear } = {}) {
  closeInput();
  const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  if (settings.device) audio.deviceId = { exact: settings.device };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio });
  } catch (err) {
    if (!settings.device || err.name !== 'OverconstrainedError') throw err;
    delete audio.deviceId;   // entrée choisie débranchée : entrée par défaut
    stream = await navigator.mediaDevices.getUserMedia({ audio });
  }
  source = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;   // ≈ 85 ms à 48 kHz : plusieurs périodes du Mi grave
  source.connect(analyser);  // rien vers les haut-parleurs
  tracker = createTracker(settings.threshold);
  const buf = new Float32Array(analyser.fftSize);
  timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const r = detectPitch(buf, ctx.sampleRate);
    lastRms = r.rms;
    onHear?.(r);
    const note = tracker.push(r);
    if (note) onNote?.(note);
  }, PERIOD);
}

export function closeInput() {
  clearInterval(timer);
  timer = null;
  source?.disconnect();
  stream?.getTracks().forEach((t) => t.stop());
  stream = source = analyser = tracker = null;
  lastRms = 0;
}

export const inputLevel = () => lastRms;
export const inputOpen = () => !!stream;
