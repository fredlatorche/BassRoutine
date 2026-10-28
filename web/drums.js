// Batterie synthétisée (Tone.js) et rythmes par style.

const SWING = 2 / 3;

// Rythmes : `bars` mesures de 4 temps, chaque coup { t (en temps depuis le début du motif), d (fût), v }.
const PATTERNS = {
  // Ride swing « ding, ding-da ding », charleston au pied sur 2 et 4, grosse caisse effleurée.
  walking: {
    bars: 1,
    hits: [
      { t: 0, d: 'ride', v: 0.65 }, { t: 1, d: 'ride', v: 0.8 }, { t: 1 + SWING, d: 'ride', v: 0.5 },
      { t: 2, d: 'ride', v: 0.65 }, { t: 3, d: 'ride', v: 0.8 }, { t: 3 + SWING, d: 'ride', v: 0.5 },
      { t: 1, d: 'pedal', v: 0.6 }, { t: 3, d: 'pedal', v: 0.6 },
      { t: 0, d: 'kick', v: 0.25 }, { t: 1, d: 'kick', v: 0.2 }, { t: 2, d: 'kick', v: 0.25 }, { t: 3, d: 'kick', v: 0.2 },
    ],
  },
  // Two-feel : même ride, grosse caisse sur 1 et 3 seulement.
  two: {
    bars: 1,
    hits: [
      { t: 0, d: 'ride', v: 0.65 }, { t: 1, d: 'ride', v: 0.75 }, { t: 1 + SWING, d: 'ride', v: 0.45 },
      { t: 2, d: 'ride', v: 0.65 }, { t: 3, d: 'ride', v: 0.75 }, { t: 3 + SWING, d: 'ride', v: 0.45 },
      { t: 1, d: 'pedal', v: 0.6 }, { t: 3, d: 'pedal', v: 0.6 },
      { t: 0, d: 'kick', v: 0.35 }, { t: 2, d: 'kick', v: 0.3 },
    ],
  },
  // Bossa : charleston en croches, rim-shot sur la clave bossa (2 mesures), grosse caisse type surdo.
  bossa: {
    bars: 2,
    hits: [
      ...Array.from({ length: 16 }, (_, i) => ({ t: i / 2, d: 'hat', v: i % 2 ? 0.35 : 0.55 })),
      ...[0, 1.5, 3, 5, 6.5].map((t) => ({ t, d: 'rim', v: 0.7 })),
      ...[0, 4].flatMap((b) => [
        { t: b, d: 'kick', v: 0.7 }, { t: b + 1.5, d: 'kick', v: 0.45 },
        { t: b + 2, d: 'kick', v: 0.7 }, { t: b + 3.5, d: 'kick', v: 0.45 },
      ]),
    ],
  },
  // Pop/rock : charleston en croches, grosse caisse sur 1 et 3 (+ « et » du 3), caisse claire sur 2 et 4.
  eighths: {
    bars: 1,
    hits: [
      ...Array.from({ length: 8 }, (_, i) => ({ t: i / 2, d: 'hat', v: i % 2 ? 0.4 : 0.65 })),
      { t: 0, d: 'kick', v: 0.9 }, { t: 2, d: 'kick', v: 0.85 }, { t: 2.5, d: 'kick', v: 0.6 },
      { t: 1, d: 'snare', v: 0.85 }, { t: 3, d: 'snare', v: 0.85 },
    ],
  },
};

// Coups du motif qui tombent dans le temps `s` (temps absolu), avec t absolu.
export function patternHits(style, s, bpb) {
  const p = PATTERNS[style] ?? PATTERNS.eighths;
  const len = p.bars * 4;
  const bar = Math.floor(s / bpb);
  const pos = (bar % p.bars) * 4 + (s % bpb);   // position dans le motif
  return p.hits
    .filter((h) => h.t >= pos && h.t < pos + 1 && h.t < len)
    .map((h) => ({ ...h, t: s + (h.t - pos) }));
}

// Batterie General MIDI (piste percussion d'un fichier) -> nos fûts.
const GM = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'snare', 40: 'snare',
  42: 'hat', 44: 'pedal', 46: 'hat', 49: 'crash', 51: 'ride', 52: 'crash', 53: 'ride',
  55: 'crash', 57: 'crash', 59: 'ride',
  41: 'tom', 43: 'tom', 45: 'tom', 47: 'tom', 48: 'tom', 50: 'tom',
};
const TOM_NOTES = { 41: 'G2', 43: 'A2', 45: 'C3', 47: 'D3', 48: 'E3', 50: 'G3' };

export function gmDrumEvents(notes) {
  return notes
    .filter((n) => GM[n.midi])
    .map((n) => ({ t: n.t, d: GM[n.midi], v: n.vel ?? 0.8, note: TOM_NOTES[n.midi] }));
}

// dest : nœud de sortie (la tranche « Batterie » de la table de mixage).
export function createKit(dest) {
  const out = new Tone.Volume(-4).connect(dest);

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 6,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    volume: -2,
  }).connect(out);

  const snareFilter = new Tone.Filter(1500, 'highpass').connect(out);
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
    volume: -12,
  }).connect(snareFilter);

  const rim = new Tone.MembraneSynth({
    pitchDecay: 0.008, octaves: 2,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    volume: -12,
  }).connect(out);

  const tom = new Tone.MembraneSynth({
    pitchDecay: 0.03, octaves: 2,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    volume: -8,
  }).connect(out);

  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5,
    volume: -26,
  }).connect(out);

  const ride = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.7, release: 0.3 },
    harmonicity: 5.1, modulationIndex: 16, resonance: 7000, octaves: 1,
    volume: -28,
  }).connect(out);

  const crashFilter = new Tone.Filter(3000, 'highpass').connect(out);
  const crash = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 1.4, sustain: 0 },
    volume: -16,
  }).connect(crashFilter);

  return {
    play({ d, v, note }, time) {
      switch (d) {
        case 'kick': kick.triggerAttackRelease('C1', '8n', time, v); break;
        case 'snare': snare.triggerAttackRelease('16n', time, v); break;
        case 'rim': rim.triggerAttackRelease('A4', '32n', time, v); break;
        case 'tom': tom.triggerAttackRelease(note ?? 'C3', '8n', time, v); break;
        case 'hat': hat.triggerAttackRelease(300, '32n', time, v); break;
        case 'pedal': hat.triggerAttackRelease(250, '64n', time, v * 0.6); break;
        case 'ride': ride.triggerAttackRelease(420, '8n', time, v); break;
        case 'crash': crash.triggerAttackRelease('2n', time, v); break;
      }
    },
  };
}
