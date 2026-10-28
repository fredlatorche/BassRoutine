// Grilles d'accords des morceaux (une case = une mesure, deux accords séparés par une espace = demi-mesures).
// Seules les grilles sont ici : la ligne de basse est générée (walking.js) ou importée depuis un MIDI.

export const SONGS = [
  {
    id: 'sowhat',
    title: 'So What',
    composer: 'Miles Davis',
    bpm: 136,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7'],
      B: ['Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7'],
    },
  },
  {
    id: 'blues-f',
    title: 'Blues en F (jazz)',
    bpm: 120,
    form: ['A'],
    sections: {
      A: ['F7', 'Bb7', 'F7', 'Cm7 F7', 'Bb7', 'Bdim7', 'F7', 'Am7b5 D7', 'Gm7', 'C7', 'F7 D7', 'Gm7 C7'],
    },
  },
  {
    id: 'autumn',
    title: 'Autumn Leaves',
    bpm: 130,
    form: ['A', 'A', 'B', 'C'],
    sections: {
      A: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm6', 'Gm6'],
      B: ['Am7b5', 'D7', 'Gm6', 'Gm6', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7'],
      C: ['Am7b5', 'D7b9', 'Gm7 C7', 'Fm7 Bb7', 'Ebmaj7', 'Am7b5 D7', 'Gm6', 'Gm6'],
    },
  },
];

// Déroule la forme sur N chorus : [{ section, chorus, chords: ['Gm7', 'C7'] }, ...]
export function expandSong(song, choruses) {
  const bars = [];
  for (let c = 0; c < choruses; c++) {
    for (const sec of song.form) {
      song.sections[sec].forEach((cell, i) => {
        bars.push({ section: sec, sectionStart: i === 0, chorus: c + 1, chords: cell.split(' ') });
      });
    }
  }
  return bars;
}
