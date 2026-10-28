// Batterie synthétisée (Tone.js), rythmes par style et breaks.

const SWING = 2 / 3;

// Rythmes proposés dans le menu (clé = motif ci-dessous).
export const DRUM_STYLES = {
  walking: 'Swing (ride)',
  brushes: 'Swing aux balais',
  two: 'Two-feel',
  shuffle: 'Shuffle blues',
  bossa: 'Bossa nova',
  eighths: 'Rock',
  disco: 'Pop / disco',
  funk: 'Funk',
  halftime: 'Groove half-time',
  reggae: 'Reggae (one drop)',
};

// Rythmes qui vont avec une walking bass (choix au hasard du mode aléatoire).
export const WALKING_DRUMS = ['walking', 'brushes', 'two', 'shuffle'];
const SWUNG = new Set(['walking', 'brushes', 'two', 'shuffle', 'reggae']);

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
  // Balais : un « frotté » par demi-mesure, petites frappes sur 2 et 4.
  brushes: {
    bars: 1,
    hits: [
      { t: 0, d: 'brush', v: 0.55 }, { t: 2, d: 'brush', v: 0.55 },
      { t: 1, d: 'snare', v: 0.22 }, { t: 3, d: 'snare', v: 0.22 },
      { t: 1 + SWING, d: 'snare', v: 0.1 }, { t: 3 + SWING, d: 'snare', v: 0.1 },
      { t: 1, d: 'pedal', v: 0.5 }, { t: 3, d: 'pedal', v: 0.5 },
      { t: 0, d: 'kick', v: 0.2 }, { t: 2, d: 'kick', v: 0.2 },
    ],
  },
  // Shuffle : charleston en triolets « long-court », caisse claire sur 2 et 4.
  shuffle: {
    bars: 1,
    hits: [
      ...[0, 1, 2, 3].flatMap((b) => [{ t: b, d: 'hat', v: 0.6 }, { t: b + SWING, d: 'hat', v: 0.4 }]),
      { t: 0, d: 'kick', v: 0.85 }, { t: 2, d: 'kick', v: 0.8 }, { t: 2 + SWING, d: 'kick', v: 0.5 },
      { t: 1, d: 'snare', v: 0.8 }, { t: 3, d: 'snare', v: 0.8 },
    ],
  },
  // Pop / disco : grosse caisse sur chaque temps, charleston ouvert à contretemps, clap sur 2 et 4.
  disco: {
    bars: 1,
    hits: [
      ...[0, 1, 2, 3].flatMap((b) => [
        { t: b, d: 'kick', v: 0.85 }, { t: b, d: 'hat', v: 0.35 }, { t: b + 0.5, d: 'openhat', v: 0.5 },
      ]),
      { t: 1, d: 'snare', v: 0.75 }, { t: 3, d: 'snare', v: 0.75 },
      { t: 1, d: 'clap', v: 0.6 }, { t: 3, d: 'clap', v: 0.6 },
    ],
  },
  // Funk : charleston en doubles croches, grosse caisse syncopée, notes fantômes à la caisse claire.
  funk: {
    bars: 1,
    hits: [
      ...Array.from({ length: 16 }, (_, i) => i).filter((i) => i !== 14)
        .map((i) => ({ t: i / 4, d: 'hat', v: i % 4 === 0 ? 0.6 : i % 2 === 0 ? 0.45 : 0.28 })),
      { t: 3.5, d: 'openhat', v: 0.5 },
      { t: 0, d: 'kick', v: 0.9 }, { t: 0.75, d: 'kick', v: 0.6 }, { t: 2.5, d: 'kick', v: 0.8 }, { t: 2.75, d: 'kick', v: 0.5 },
      { t: 1, d: 'snare', v: 0.85 }, { t: 3, d: 'snare', v: 0.85 },
      { t: 1.75, d: 'snare', v: 0.16 }, { t: 2.25, d: 'snare', v: 0.14 }, { t: 3.25, d: 'snare', v: 0.14 }, { t: 3.75, d: 'snare', v: 0.18 },
    ],
  },
  // Half-time : caisse claire sur le 3 seulement, ça « respire » deux fois plus lentement.
  halftime: {
    bars: 1,
    hits: [
      ...Array.from({ length: 8 }, (_, i) => ({ t: i / 2, d: 'hat', v: i % 2 ? 0.35 : 0.5 })),
      { t: 0, d: 'kick', v: 0.9 }, { t: 0.75, d: 'kick', v: 0.55 }, { t: 2.5, d: 'kick', v: 0.7 },
      { t: 2, d: 'snare', v: 0.9 }, { t: 3.75, d: 'snare', v: 0.15 },
    ],
  },
  // Reggae « one drop » : rien sur le 1, grosse caisse et rim-shot ensemble sur le 3.
  reggae: {
    bars: 1,
    hits: [
      ...[0, 1, 2, 3].flatMap((b) => [{ t: b, d: 'hat', v: 0.45 }, { t: b + SWING, d: 'hat', v: 0.3 }]),
      { t: 2, d: 'kick', v: 0.85 }, { t: 2, d: 'rim', v: 0.8 },
    ],
  },
};

// Breaks sur le dernier temps de chaque groupe de 4 mesures : deux variantes qui alternent.
const FILLS = {
  swung: [
    [{ t: 0, d: 'snare', v: 0.45 }, { t: 1 / 3, d: 'snare', v: 0.55 }, { t: 2 / 3, d: 'tom', note: 'A2', v: 0.7 }],
    [{ t: 0, d: 'tom', note: 'E3', v: 0.6 }, { t: 1 / 3, d: 'tom', note: 'C3', v: 0.65 }, { t: 2 / 3, d: 'tom', note: 'A2', v: 0.75 }],
  ],
  straight: [
    [{ t: 0, d: 'snare', v: 0.5 }, { t: 0.25, d: 'snare', v: 0.55 }, { t: 0.5, d: 'snare', v: 0.65 }, { t: 0.75, d: 'snare', v: 0.75 }],
    [{ t: 0, d: 'snare', v: 0.6 }, { t: 0.25, d: 'snare', v: 0.5 }, { t: 0.5, d: 'tom', note: 'C3', v: 0.7 }, { t: 0.75, d: 'tom', note: 'G2', v: 0.8 }],
  ],
};

// Coups du motif qui tombent dans le temps `s` (temps absolu), avec t absolu.
// fills : break sur le dernier temps de chaque 4e mesure, puis crash sur le temps 1 suivant.
export function patternHits(style, s, bpb, fills = false) {
  const p = PATTERNS[style] ?? PATTERNS.eighths;
  const len = p.bars * 4;
  const bar = Math.floor(s / bpb);
  const beat = s % bpb;
  if (fills && bar % 4 === 3 && beat === bpb - 1) {
    const variants = FILLS[SWUNG.has(style) ? 'swung' : 'straight'];
    return variants[Math.floor(bar / 4) % variants.length].map((h) => ({ ...h, t: s + h.t }));
  }
  const pos = (bar % p.bars) * 4 + beat;   // position dans le motif
  const hits = p.hits
    .filter((h) => h.t >= pos && h.t < pos + 1 && h.t < len)
    .map((h) => ({ ...h, t: s + (h.t - pos) }));
  if (fills && bar > 0 && bar % 4 === 0 && beat === 0) hits.push({ t: s, d: 'crash', v: 0.45 });
  return hits;
}

// Batterie General MIDI (piste percussion d'un fichier) -> nos fûts.
const GM = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 40: 'snare',
  42: 'hat', 44: 'pedal', 46: 'openhat', 39: 'clap', 49: 'crash', 51: 'ride', 52: 'crash', 53: 'ride',
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

  // Balais : souffle filtré, attaque douce (le « frotté »).
  const brushFilter = new Tone.Filter(2500, 'bandpass').connect(out);
  const brush = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.06, decay: 0.35, sustain: 0 },
    volume: -14,
  }).connect(brushFilter);

  const openHat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5,
    volume: -28,
  }).connect(out);

  const clapFilter = new Tone.Filter(1200, 'bandpass').connect(out);
  const clap = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.002, decay: 0.12, sustain: 0 },
    volume: -12,
  }).connect(clapFilter);

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
        case 'brush': brush.triggerAttackRelease('8n', time, v); break;
        case 'openhat': openHat.triggerAttackRelease(300, '8n', time, v); break;
        case 'clap': clap.triggerAttackRelease('16n', time, v); break;
      }
    },
  };
}
