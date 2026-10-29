// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Lecture d'un fichier MIDI (bibliothèque @tonejs/midi, globale `Midi` chargée par vendor/Midi.js).

// Armure d'après la tonalité indiquée dans le fichier (dièses > 0, bémols < 0).
const MAJOR = { Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7 };
const MINOR = { Ab: -7, Eb: -6, Bb: -5, F: -4, C: -3, G: -2, D: -1, A: 0, E: 1, B: 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7 };

export async function readMidiFile(file) {
  const midi = new Midi(await file.arrayBuffer());
  const ppq = midi.header.ppq;
  const [num, den] = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];

  const tracks = midi.tracks
    .filter((t) => t.notes.length)
    .map((t, i) => ({
      name: t.name || t.instrument.name || `Piste ${i + 1}`,
      program: t.instrument.number,
      percussion: t.instrument.percussion,
      notes: t.notes.map((n) => ({
        t: n.ticks / ppq,             // en temps (noires)
        dur: n.durationTicks / ppq,
        midi: n.midi,
        vel: n.velocity,
      })),
    }));

  return {
    title: midi.name || file.name.replace(/\.midi?$/i, ''),
    bpm: Math.round(midi.header.tempos[0]?.bpm ?? 120),
    beatsPerBar: (num * 4) / den,
    fifths: (() => {
      const k = midi.header.keySignatures[0];
      return k ? ((k.scale === 'minor' ? MINOR : MAJOR)[k.key] ?? 0) : 0;
    })(),
    tracks,
  };
}

// Piste de basse probable : instrument GM « basse » (33 à 40, soit 32 à 39 ici), sinon la plus grave.
export function guessBassTrack(tracks) {
  const melodic = tracks.map((t, i) => ({ t, i })).filter(({ t }) => !t.percussion);
  const bass = melodic.find(({ t }) => t.program >= 32 && t.program <= 39);
  if (bass) return bass.i;
  const avg = ({ t }) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
  const lowest = melodic.sort((a, b) => avg(a) - avg(b))[0];
  return lowest ? lowest.i : 0;
}
