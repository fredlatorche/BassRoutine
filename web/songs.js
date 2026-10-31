// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Grilles d'accords des morceaux (une case = une mesure, deux accords séparés par une espace = demi-mesures).
// group : rubrique du menu Morceau.
// Seules les grilles sont ici : la ligne de basse est générée (walking.js) ou importée depuis un MIDI.

export const SONGS = [
  {
    id: 'sowhat',
    group: 'Jazz',
    title: 'So What',
    composer: 'Miles Davis',
    bpm: 136,
    fifths: 0,   // armure : Ré dorien, sans altération à la clé
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7'],
      B: ['Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7'],
    },
  },
  {
    id: 'blues-f',
    group: 'Jazz',
    title: 'Blues en F (jazz)',
    bpm: 120,
    fifths: -1,
    form: ['A'],
    sections: {
      A: ['F7', 'Bb7', 'F7', 'Cm7 F7', 'Bb7', 'Bdim7', 'F7', 'Am7b5 D7', 'Gm7', 'C7', 'F7 D7', 'Gm7 C7'],
    },
  },
  {
    id: 'autumn',
    group: 'Jazz',
    title: 'Autumn Leaves',
    bpm: 130,
    fifths: -2,   // Sol mineur
    form: ['A', 'A', 'B', 'C'],
    sections: {
      A: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm6', 'Gm6'],
      B: ['Am7b5', 'D7', 'Gm6', 'Gm6', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7'],
      C: ['Am7b5', 'D7b9', 'Gm7 C7', 'Fm7 Bb7', 'Ebmaj7', 'Am7b5 D7', 'Gm6', 'Gm6'],
    },
  },
  // style : ligne proposée quand on choisit le morceau (on peut toujours en changer).
  {
    id: 'rhythm',
    group: 'Jazz',
    title: 'Rhythm changes (I Got Rhythm)',
    composer: 'George Gershwin, 1930',
    bpm: 160,
    fifths: -2,
    style: 'walking',
    form: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: ['Bb6 G7', 'Cm7 F7', 'Dm7 G7', 'Cm7 F7', 'Fm7 Bb7', 'Ebmaj7 Ebm7', 'Dm7 G7', 'Cm7 F7'],
      A2: ['Bb6 G7', 'Cm7 F7', 'Dm7 G7', 'Cm7 F7', 'Fm7 Bb7', 'Ebmaj7 Ebm7', 'Cm7 F7', 'Bb6'],
      B: ['D7', 'D7', 'G7', 'G7', 'C7', 'C7', 'F7', 'F7'],
    },
  },
  {
    id: 'bluebossa',
    group: 'Jazz',
    title: 'Blue Bossa (grille complète)',
    composer: 'Kenny Dorham',
    bpm: 140,
    fifths: -3,
    style: 'bossa',
    form: ['A'],
    sections: {
      A: ['Cm7', 'Cm7', 'Fm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Cm7',
        'Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7', 'Dm7b5', 'G7', 'Cm7', 'Dm7b5 G7'],
    },
  },
  {
    id: 'saints',
    group: 'Traditionnels (domaine public)',
    title: 'When the Saints Go Marching In',
    composer: 'Traditionnel (New Orleans)',
    bpm: 170,
    fifths: -1,
    style: 'two',
    form: ['A'],
    sections: {
      A: ['F', 'F', 'F', 'F', 'F', 'F', 'C7', 'C7', 'F', 'F7', 'Bb', 'Bbm6', 'F', 'C7', 'F', 'F'],
    },
  },
  {
    id: 'jericho',
    group: 'Traditionnels (domaine public)',
    title: 'Joshua Fit the Battle of Jericho',
    composer: 'Traditionnel (spiritual)',
    bpm: 150,
    fifths: -1,   // Ré mineur
    style: 'walking',
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: ['Dm', 'Dm', 'A7', 'Dm', 'Dm', 'Dm', 'A7', 'Dm'],
      B: ['Dm', 'Dm', 'Gm', 'Dm', 'Bb7', 'A7', 'Dm', 'A7'],
    },
  },
  {
    id: 'swinglow',
    group: 'Traditionnels (domaine public)',
    title: 'Swing Low, Sweet Chariot',
    composer: 'Traditionnel (spiritual)',
    bpm: 76,
    fifths: -1,
    style: 'two',
    form: ['A', 'A'],
    sections: {
      A: ['F', 'Bb F', 'F', 'C7', 'F', 'Bb F', 'F C7', 'F'],
    },
  },
  {
    id: 'canon',
    group: 'Traditionnels (domaine public)',
    title: 'Canon de Pachelbel (accords à la demi-mesure)',
    composer: 'Johann Pachelbel, vers 1680',
    bpm: 90,
    fifths: 2,
    style: 'eighths',
    form: ['A'],
    sections: {
      A: ['D A', 'Bm F#m', 'G D', 'G A', 'D A', 'Bm F#m', 'G D', 'G A'],
    },
  },
  {
    id: 'rocknroll',
    group: 'Pop, rock, funk',
    title: 'Rock\'n\'roll – blues en La',
    composer: 'Grille de blues (12 mesures)',
    bpm: 160,
    fifths: 3,
    style: 'eighths',
    form: ['A'],
    sections: {
      A: ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'],
    },
  },
  {
    id: 'andalouse',
    group: 'Pop, rock, funk',
    title: 'Cadence andalouse (La m – Sol – Fa – Mi)',
    composer: 'Grille traditionnelle (flamenco, rock)',
    bpm: 120,
    fifths: 0,
    style: 'eighths',
    form: ['A'],
    sections: {
      A: ['Am G', 'F E7', 'Am G', 'F E7', 'Am G', 'F E7', 'F', 'E7'],
    },
  },
  {
    id: 'doowop',
    group: 'Pop, rock, funk',
    title: 'Progression années 50 (Do – La m – Fa – Sol)',
    composer: 'Grille « doo-wop »',
    bpm: 110,
    fifths: 0,
    style: 'eighths',
    form: ['A'],
    sections: {
      A: ['C Am', 'F G', 'C Am', 'F G7', 'C Am', 'F G', 'F G7', 'C'],
    },
  },
  {
    id: 'dorian',
    group: 'Pop, rock, funk',
    title: 'Vamp funk dorien (Mi m7 – La7)',
    composer: 'Grille de funk / latin rock',
    bpm: 100,
    fifths: 2,
    style: 'eighths',
    form: ['A'],
    sections: {
      A: ['Em7 A7', 'Em7 A7', 'Em7 A7', 'Em7 A7', 'Em7 A7', 'Em7 A7', 'Cmaj7', 'B7'],
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
