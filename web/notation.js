// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Noms des notes affichés : français (Do, Ré, Mi…) ou américain (C, D, E…).
// Les noms sont calculés en français partout ; on les convertit seulement à l'affichage.

const FR_TO_EN = { Do: 'C', Ré: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
let notation = 'fr';

export const setNotation = (n) => { notation = n === 'en' ? 'en' : 'fr'; };
export const getNotation = () => notation;

// « Si♭ » -> « B♭ », « Fa♯ » -> « F♯ », « Ré# » -> « D♯ » (en notation américaine).
export function noteLabel(fr) {
  if (notation === 'fr') return fr;
  const m = /^(Do|Ré|Mi|Fa|Sol|La|Si)(.*)$/.exec(fr);
  return m ? FR_TO_EN[m[1]] + m[2].replace(/#/g, '♯') : fr;
}
