// Lecture d'un fichier MIDI (bibliothèque @tonejs/midi, globale `Midi` chargée par vendor/Midi.js).

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
