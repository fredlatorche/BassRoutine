// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Mode 🎯 Jeu : la lecture tourne, l'app écoute la basse et note chaque note attendue sur la justesse
// et le rythme (attaque en avance ou en retard), puis donne une note sur 10 à la fin de la partie.

const KEY = 'bassroutine-game';
const RECORDS_KEY = 'bassroutine-game-records';

// Justesse : écart maximal (cents) pour une note parfaitement juste ; 'off' = pas notée.
export const GAME_PITCH = {
  off: 'Pas notée (rythme seulement)',
  50: 'Large (± 50 cents)',
  25: 'Moyen (± 25 cents)',
  12: 'Précis (± 12 cents)',
  6: 'Expert (± 6 cents)',
};
// Rythme : écart maximal (ms) entre l'attaque et le temps prévu.
export const GAME_RHYTHM = {
  100: 'Large (± 100 ms)',
  60: 'Moyen (± 60 ms)',
  30: 'Précis (± 30 ms)',
  15: 'Expert (± 15 ms)',
};
// Durée d'une partie quand l'exercice tourne en boucle (0 = sans fin, une note à chaque tour).
export const GAME_TOURS = { 1: '1 tour', 2: '2 tours', 4: '4 tours', 8: '8 tours', 0: 'Sans fin (une note par tour)' };

// offset : retard (ms) entre le son entendu et la note reçue (haut-parleurs, interface, réflexe).
const settings = { pitch: '25', rhythm: 60, tours: 2, offset: 0 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* stockage indisponible */ }
export const gameSettings = () => ({ ...settings });
export function setGame(change) {
  Object.assign(settings, change);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
}

// Fenêtre (s) autour du temps prévu où une note jouée est rattachée à la note attendue.
export const matchWindow = () => Math.max(0.2, (3 * settings.rhythm) / 1000);

// Note d'une note attendue { time, midi } jouée { time, pitch } (heures audio en s, pitch précis en demi-tons).
// L'octave n'est pas jugée (ligne jouée plus haut ou plus bas : même note). Renvoie
// { score (0 à 1), cls ('hit', 'near', 'miss'), dt (ms), cents, wrong }.
export function judge(expected, heard) {
  const dt = (heard.time - expected.time) * 1000;
  const rTol = settings.rhythm;
  const rhythm = Math.abs(dt) <= rTol ? 1 : Math.abs(dt) <= 2 * rTol ? 0.5 : 0;
  let score = rhythm, cents = null, wrong = false;
  if (settings.pitch !== 'off') {
    let diff = heard.pitch - expected.midi;
    diff -= 12 * Math.round(diff / 12);
    cents = Math.round(diff * 100);
    wrong = Math.abs(diff) > 0.5;
    const pTol = Number(settings.pitch);
    const pitch = wrong ? 0 : Math.abs(cents) <= pTol ? 1 : Math.abs(cents) <= 2 * pTol ? 0.5 : 0;
    score = (pitch + rhythm) / 2;
  }
  return { score, cls: classOf(score), dt, cents, wrong, rhythmOk: rhythm === 1, pitchOk: !wrong && cents != null && Math.abs(cents) <= Number(settings.pitch) };
}
export const MISSED = { score: 0, cls: 'miss', missed: true };
const classOf = (score) => (score >= 0.99 ? 'hit' : score >= 0.5 ? 'near' : 'miss');

// Note sur 10 (une décimale) d'une liste de résultats.
export const score10 = (results) => (results.length ? Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 100) / 10 : 0);
export const formatScore = (x) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export function summarize(results) {
  const played = results.filter((r) => !r.missed);
  const pct = (n) => (results.length ? Math.round((n / results.length) * 100) : 0);
  const dts = played.map((r) => r.dt);
  return {
    score: score10(results),
    notes: results.length,
    missed: results.length - played.length,
    pitchPct: settings.pitch === 'off' ? null : pct(played.filter((r) => r.pitchOk).length),
    rhythmPct: pct(played.filter((r) => r.rhythmOk).length),
    // Tendance : médiane des écarts d'attaque (en avance < 0 < en retard).
    lean: dts.length >= 4 ? [...dts].sort((a, b) => a - b)[dts.length >> 1] : null,
  };
}

// Meilleure note par exercice (et niveaux choisis), gardée sur l'appareil.
export function saveRecord(exercise, score) {
  const id = `${exercise} · ${settings.pitch}/${settings.rhythm}`;
  let records = {};
  try { records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}'); } catch { /* stockage indisponible */ }
  const best = records[id];
  if (best == null || score > best) {
    records[id] = score;
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* stockage indisponible */ }
  }
  return { best: Math.max(best ?? 0, score), isNew: best != null && score > best, previous: best };
}

// Petit mot selon la note, tiré au hasard (23 par tranche), et l'humeur du bassiste :
// la star (9 et plus), il danse (7 et plus), il réfléchit (3 et plus), dépité (moins de 3).
const MESSAGES = [
  [10, '🧑‍🎤', [
    'Parfait ! Même le métronome est jaloux.',
    'Sans faute. Le batteur vient de te demander ton numéro.',
    '10/10 : on encadre la tab et on la met au salon.',
    'Perfection absolue. Le métronome demande un autographe.',
    '10/10. Tu peux poser la basse, la légende est en marche.',
    'Même un séquenceur n\'aurait pas fait mieux. Tu es sûr d\'être humain ?',
    'Sans une égratignure. La partition n\'en revient pas.',
    'Parfait ! Les cordes te remercient de les avoir si bien traitées.',
    'Score maximal. Il va falloir inventer une note sur 11.',
    'Impeccable. Le batteur peut rentrer chez lui, tu tiens la maison.',
    'Chaque note pile à sa place. Le temps lui-même s\'est calé sur toi.',
    'Perfection ! On appelle ça le groove de compétition.',
    '10/10 : même ton accordeur est ému.',
    'Pas une note de travers. Les frettes applaudissent.',
    'Parfait. Tu viens de rendre ton ampli très fier.',
    'Rien à redire. Enfin si : bravo !',
    'Un sans-faute. Le public réclame un rappel.',
    'Exceptionnel ! Cette partie mérite d\'être encadrée à côté de la tab.',
    '10 sur 10. Le guitariste vient de ranger son ego.',
    'Parfait ! Les quatre cordes ont voté à l\'unanimité.',
    'Score parfait. La basse et toi, c\'est une histoire d\'amour.',
    'Impeccable. Même le chat a arrêté de bouger pour écouter.',
    'La perfection existe, et elle joue de la basse.',
  ]],
  [9, '🧑‍🎤', [
    'Impressionnant ! Le public tape du pied, le voisin aussi.',
    'Presque parfait : il ne manquait que les applaudissements.',
    'Quel groove ! Le batteur peut enfin se reposer sur toi.',
    'Superbe ! À un cheveu de la perfection, et encore, un cheveu de contrebasse.',
    'Excellent ! Le groupe vient de te proposer le devant de la scène.',
    'Très haut niveau. Le métronome prend des notes.',
    '9 et des poussières : il reste juste à dépoussiérer.',
    'Magnifique ! Une ou deux notes rebelles, mais le groove a gagné.',
    'Brillant ! On sent le bassiste qui a fait ses gammes.',
    'Presque irréprochable. La prochaine, c\'est le 10.',
    'Remarquable ! Le batteur s\'est enfin calé sur ton tempo.',
    'Classe ! Tes doigts ont été très bien élevés.',
    'Quasi parfait : la petite imperfection, c\'est la signature de l\'artiste.',
    'Sublime ! Il ne manquait qu\'une poursuite et un peu de fumée.',
    'Excellent ! Ta basse ronronne de plaisir.',
    'Très grande partie. Quelqu\'un a pensé à enregistrer ?',
    'Formidable ! Le groove est solide comme une corde de Mi.',
    'Bravo ! Même les notes fantômes étaient à l\'heure.',
    'Superbe ! L\'accordeur n\'a presque rien eu à dire.',
    'Impressionnant ! On t\'imagine déjà en concert.',
    'Splendide ! Tu as le rythme dans les doigts et dans les pieds.',
    'Excellent : tes voisins ont ouvert la fenêtre pour mieux entendre.',
    'Bravo ! Il ne te manque qu\'un costume à paillettes.',
  ]],
  [8, '🕺', [
    'Très bien ! Le groove est là, on part en tournée.',
    'Solide ! Tu es le ciment du groupe (et c\'est un compliment).',
    'Belle partie ! Le guitariste ne s\'est même pas retourné.',
    'Très bonne partie ! Le groove a pris le pouvoir.',
    'Bien solide ! Le batteur te fait confiance les yeux fermés.',
    'Bravo ! Encore un peu de précision et tu flirtes avec le 10.',
    'Belle régularité ! Tu tiens la baraque.',
    'Très bien ! La ligne de basse est entre de bonnes mains.',
    'Joli ! Quelques notes à polir, mais ça sonne déjà.',
    'Bon groove ! Les pieds du public tapent tout seuls.',
    'Bien joué ! Ton ampli est fier de toi.',
    'Très propre ! On monte un peu le tempo, non ?',
    'Bravo ! Le chef d\'orchestre a rangé sa baguette, il n\'en a plus besoin.',
    'Belle performance ! Les accords se sentent bien soutenus.',
    'Très bien ! Le pianiste ne cherche plus la basse, il l\'entend.',
    'Solide comme un manche en érable !',
    'Bonne partie ! La fondamentale est là, au sens propre.',
    'Très bien ! Encore quelques tours et ce sera du velours.',
    'Ça groove ! Personne n\'a remarqué les deux petites fautes. Enfin, presque personne.',
    'Belle maîtrise ! Tu peux être fier de tes quatre cordes.',
    'Très bien ! Le genre de partie qu\'on rejoue pour le plaisir.',
    'Bien joué ! La section rythmique, c\'est toi.',
    'Bravo ! Le groupe peut dormir tranquille, la basse veille.',
  ]],
  [7, '🕺', [
    'Bien joué ! Encore quelques tours et c\'est la scène.',
    'C\'est propre ! Les quelques écarts, on dira que c\'était du feeling.',
    'Bon niveau ! Le groupe te garde pour la répétition de jeudi.',
    'Bonne partie ! Il reste quelques notes à apprivoiser.',
    'C\'est bien ! Le groove pointe le bout de son nez.',
    'Pas mal ! On sent que ça va finir par rentrer.',
    'Bien ! Quelques écarts, mais l\'essentiel est là.',
    'Plutôt bien ! Un ou deux tours de plus et ça décolle.',
    'Bon travail ! Le métronome t\'a à l\'œil, mais il est plutôt content.',
    'Ça tient ! Le batteur hésite encore à te confier le tempo.',
    'Bien joué ! Tes doigts apprennent vite.',
    'Jolie partie ! Il ne manque que quelques finitions.',
    'Bien ! On peut dire que la ligne est apprivoisée.',
    'Pas mal du tout ! Le groupe hoche la tête en rythme.',
    'C\'est bien parti ! La prochaine fois, vise le 8.',
    'Bonne base ! Et pour un bassiste, la base c\'est le plus important.',
    'Bien ! Les notes justes ont largement gagné le match.',
    'Encourageant ! Ta basse commence à te faire confiance.',
    'Joli ! On garde cette partie, on corrige deux détails.',
    'Bon niveau ! Le public applaudit, poliment mais sincèrement.',
    'Bien ! On sent l\'effort, et le groove suit.',
    'Ça avance bien ! Le chemin vers le 10 est tout tracé.',
    'Bien joué ! Encore quelques répétitions et c\'est dans les doigts.',
  ]],
  [6, '🤔', [
    'Pas mal du tout ! Le chef d\'orchestre hoche la tête.',
    'Ça tient la route ! Un petit coup de métronome et ça brille.',
    'Honnête ! Le batteur t\'a fait un clin d\'œil… ou il avait une poussière.',
    'Pas mal ! La ligne commence à prendre forme.',
    'Ça progresse ! Quelques notes font encore les rebelles.',
    'Correct ! Le groove est là, il cherche juste ses lunettes.',
    'Pas mal ! Un peu de métronome et on passe au niveau suivant.',
    'Les bonnes notes sont là : reste à les poser au bon moment.',
    'Honorable ! Tes doigts ont compris l\'idée.',
    'Ça tient debout ! Il faut juste resserrer quelques boulons.',
    'Pas mal ! La basse est contente, l\'accordeur un peu moins.',
    'Plutôt bien ! Rejoue-la, la deuxième sera meilleure.',
    'Pas mal ! Le batteur te suit… avec un peu d\'inquiétude.',
    'Ça vient ! On entend déjà la ligne derrière les petites fautes.',
    'Correct ! Un tempo un poil plus lent pourrait faire des miracles.',
    'Pas mal ! Certaines notes sont juste un peu pressées d\'arriver.',
    'Honnête partie ! La régularité viendra avec les répétitions.',
    'Bien essayé ! Le groove est en chantier, mais le chantier avance.',
    'Pas mal ! Le chef d\'orchestre lève un sourcil, mais il sourit.',
    'Ça avance ! Tes doigts font leurs devoirs.',
    'Correct ! Il ne reste qu\'une marche avant le « bien ».',
    'Pas mal ! Le public ne s\'est pas enfui, c\'est bon signe.',
    'Bonne base de travail ! On remet ça ?',
  ]],
  [5, '🤔', [
    'La moyenne ! Le bassiste moyen est content, le perfectionniste un peu moins.',
    'À moitié juste, donc à moitié génial.',
    'Ça avance ! On garde la basse, on change juste quelques notes.',
    'La moyenne ! Une note sur deux est parfaite, l\'autre est créative.',
    'Pile à la moitié du chemin ! L\'autre moitié t\'attend.',
    'Moyenne obtenue ! Le métronome hausse les épaules.',
    'Pas si mal ! Le groove est encore un peu timide.',
    'Ça passe ! On ralentit un peu et on retente ?',
    'La moitié des notes sont parfaites. Les autres font du jazz expérimental.',
    'Correct… ou presque ! Ta basse t\'encourage à continuer.',
    'Moyenne atteinte ! Le chemin du groove est pavé de répétitions.',
    'Ça commence à ressembler à quelque chose ! Garde le cap.',
    '5/10 : le verre est à moitié plein (de bonnes notes).',
    'Pas mal pour une mise en jambes !',
    'La ligne est reconnaissable, c\'est déjà une victoire.',
    'Moyen, mais motivant ! La prochaine sera meilleure.',
    'Ça avance doucement, comme une ballade.',
    'La moyenne ! Le batteur te propose un café et une deuxième tentative.',
    'Mi-figue, mi-raisin, mais 100 % bassiste.',
    'Bon début ! Les doigts se réveillent.',
    'Pile au milieu ! Ni trop, ni trop peu, juste à améliorer.',
    'On est sur la bonne pente ! Il reste à la monter.',
    'Partie honnête ! Avec un tempo plus doux, ce sera tout de suite mieux.',
  ]],
  [3, '🤔', [
    'Courage ! Même les grands ont commencé par des Mi à vide.',
    'Ça vient ! Rome ne s\'est pas faite en un jour, la walking bass non plus.',
    'Pas de panique : ralentis le tempo, la basse n\'est pas pressée.',
    'Courage ! Chaque grand bassiste a eu ses jours sans.',
    'Ça viendra ! La musique n\'est pas une course.',
    'Pas grave ! Les fausses notes d\'aujourd\'hui sont les bonnes de demain.',
    'On continue ! La basse aime les gens persévérants.',
    'Tiens bon ! Même les cordes ont besoin de chauffer.',
    'Pas encore ça, mais le groove est quelque part : il se cache.',
    'Courage ! Joue plus lentement, le tempo t\'attendra.',
    'Ça arrive ! Le premier pas vers le 10, c\'est celui-ci.',
    'Respire, ralentis, recommence : la recette magique.',
    'Pas de souci ! Même le métronome a eu des débuts difficiles.',
    'On s\'accroche ! Cette ligne n\'a qu\'à bien se tenir.',
    'Ce n\'est qu\'une répétition, pas un concert. Rejoue !',
    'Patience ! Les doigts apprennent, même quand ça ne s\'entend pas encore.',
    'Ça viendra ! Mets le passage difficile en boucle avec Début / Fin.',
    'Pas encore ! Mais tu as joué, et c\'est déjà beaucoup.',
    'Allez ! Une gorgée d\'eau, un tempo plus lent, et c\'est reparti.',
    'Le groove est timide aujourd\'hui. Il faut l\'apprivoiser.',
    'Chaque fausse note te rapproche de la bonne. Mathématiquement.',
    'Courage ! Tes doigts font des progrès en secret.',
    'Pas de panique : on appelle ça « travailler », et c\'est exactement ce que tu fais.',
  ]],
  [0, '🙃', [
    'Aïe ! On dira que c\'était du free jazz.',
    'Le métronome a démissionné, mais toi tu ne lâches rien !',
    'Ta basse est-elle branchée ? (Si oui : ralentis, tout va bien se passer.)',
    'Hmm. On va dire que c\'était une improvisation très libre.',
    'Aïe ! Le métronome est parti se coucher.',
    'C\'était… audacieux. Très audacieux.',
    'Tu as inventé un nouveau style. Il n\'a pas encore de nom.',
    'Pas de panique : tout le monde est passé par là.',
    'Le micro t\'entend-il bien ? Jette un œil à l\'entrée audio dans ⚙️.',
    'Ouille ! On ralentit beaucoup et on recommence ?',
    'Les notes et toi, vous vous cherchiez. Rendez-vous à la prochaine partie.',
    'C\'était de l\'art contemporain. Le public n\'est pas encore prêt.',
    'Le groove a pris un jour de congé.',
    'Tes cordes sont-elles accordées ? L\'accordeur est juste là, en haut.',
    'Pas grave : un vrai bassiste se relève toujours (et rebranche son jack).',
    'Respire. Ralentis le tempo de moitié. Tout va bien se passer.',
    'Ce n\'est pas un échec, c\'est une première prise.',
    'Le batteur a demandé si c\'était voulu. On a dit oui.',
    'On dira que tu testais la résistance du métronome.',
    'Les notes étaient bonnes, juste pas dans cet ordre-là.',
    'Un départ en douceur ! Très en douceur.',
    'La partition a fait un malaise, mais elle s\'en remettra.',
    'Tout le monde commence quelque part. Toi, c\'est ici, et c\'est très bien.',
  ]],
];

// Remarques selon la situation (record, retard, tempo, tours…), par ordre d'importance ;
// les deux premières qui s'appliquent sont affichées sous le petit mot.
const SITUATIONS = [
  [(c) => c.record?.isNew, [
    '🏅 Nouveau record ! L\'ancien n\'a rien vu venir.',
    '🏅 Record battu ! Tu viens de te dépasser, littéralement.',
    '🏅 Nouveau record : ton toi d\'hier est un peu jaloux.',
    '🏅 Record pulvérisé ! On l\'affiche sur le frigo.',
    '🏅 Meilleure note sur cet exercice : le progrès, ça s\'entend.',
  ]],
  [(c) => c.stopped && c.notes < 12, [
    '✋ Partie courte : joue-la jusqu\'au bout pour une note plus fiable.',
    '✋ Arrêt rapide ! La note compte, mais elle dira plus de choses sur une partie entière.',
    '✋ Tu t\'es arrêté tôt : la prochaine fois, on va jusqu\'au bout ?',
  ]],
  [(c) => c.expert && c.score >= 7, [
    '🔬 Et ça, avec des réglages Expert ! Respect.',
    '🔬 Avec des réglages aussi stricts, cette note vaut double.',
    '🔬 Niveau Expert et tu tiens bon : tes oreilles sont affûtées.',
    '🔬 Précision chirurgicale : même au niveau Expert, ça passe.',
  ]],
  [(c) => c.missedPct > 30, [
    '🔇 Beaucoup de notes sont passées sans être jouées : ralentis le tempo pour suivre la ligne.',
    '🔇 L\'app n\'a pas entendu une bonne partie des notes : vérifie le seuil de l\'entrée audio dans ⚙️.',
    '🔇 Plusieurs notes manquent à l\'appel. Un tempo plus lent les fera revenir.',
    '🔇 Des notes oubliées : regarde un peu plus loin dans la tab pour anticiper la suite.',
  ]],
  [(c) => c.pitchPct != null && c.pitchPct >= 80 && c.rhythmPct < 50, [
    '🎯 Tes notes sont justes ! C\'est le moment de les jouer qui reste à caler : le métronome est ton ami.',
    '🎯 Justesse au top, rythme à revoir : coche le métronome et joue avec lui.',
    '🎯 Les bonnes notes sont là, elles arrivent juste quand elles veulent.',
    '🎯 Bonne oreille ! Maintenant, écoute la batterie et pose chaque note dessus.',
  ]],
  [(c) => c.pitchPct != null && c.rhythmPct >= 80 && c.pitchPct < 50, [
    '🥁 Le rythme est impeccable ! Reste à trouver les bonnes cases.',
    '🥁 Ton timing est excellent, la justesse va suivre : vérifie l\'accordage avec l\'accordeur.',
    '🥁 Tu es pile dans le temps ! Garde un œil sur la tab pour les notes.',
    '🥁 Un vrai métronome humain ! Les notes, elles, ont encore besoin de la tab.',
  ]],
  [(c) => c.improving, [
    '📈 Tu t\'améliores à chaque tour ! Continue comme ça.',
    '📈 Belle progression au fil des tours : l\'échauffement a payé.',
    '📈 Le dernier tour était le meilleur : c\'est en jouant qu\'on devient bassiste.',
    '📈 Tour après tour, ça monte : la ligne rentre dans les doigts.',
  ]],
  [(c) => c.declining, [
    '📉 Les derniers tours étaient moins bons : un peu de fatigue ? Fais une pause.',
    '📉 La concentration baisse sur la fin : une pause, un verre d\'eau, et ça repart.',
    '📉 Tu as commencé fort et fini plus doucement : garde de l\'énergie pour la fin.',
  ]],
  [(c) => c.lean != null && c.lean > 25, [
    '⏱ Tu joues un peu derrière le temps : c\'est très jazz, mais là c\'est un poil trop.',
    '⏱ Légèrement en retard : le batteur t\'attend à chaque temps.',
    '⏱ Tes notes arrivent un peu tard. Attaque comme si le temps tombait un chouïa plus tôt.',
    '⏱ Un léger retard : as-tu mesuré le retard dans ⚙️ ? Sinon, ce sont peut-être tes doigts qui traînent.',
    '⏱ Tu es un peu trop « laid back » : rapproche-toi du clic.',
  ]],
  [(c) => c.lean != null && c.lean < -25, [
    '⏱ Tu es un peu pressé : le temps ne va pas s\'enfuir.',
    '⏱ Légèrement en avance : détends-toi, laisse le temps venir à toi.',
    '⏱ Tes notes arrivent un peu tôt. Écoute la batterie et pose-toi dessus.',
    '⏱ Un bassiste en avance, c\'est rare ! Respire entre les notes.',
  ]],
  [(c) => c.tempo >= 160 && c.score >= 7, [
    '🚀 À ce tempo-là ? Tes doigts ont des ailes.',
    '🚀 Rapide ET précis : la combinaison rêvée.',
    '🚀 À cette vitesse, c\'est le métronome qui transpire.',
    '🚀 Tempo d\'enfer, et tu tiens la route : chapeau.',
  ]],
  [(c) => c.tempo >= 130 && c.score < 5, [
    '🐢 Ce tempo est rapide : baisse-le de 20 BPM, tu verras la différence.',
    '🐢 Commence plus lentement, la vitesse viendra toute seule.',
    '🐢 Un tempo plus doux pour apprendre, plus rapide pour briller : chaque chose en son temps.',
  ]],
  [(c) => c.tempo <= 80 && c.score >= 9, [
    '🐢 Parfait à ce tempo : monte-le de 10 BPM pour le prochain défi.',
    '🐢 Ce tempo est maîtrisé. On accélère un peu ?',
    '🐢 Trop facile à cette vitesse ! Prochaine étape : +10 BPM.',
  ]],
  [(c) => (c.meter === '6/8' || c.meter === '12/8') && c.score >= 8, [
    '🎶 Le ternaire n\'a plus de secret pour toi.',
    '🎶 Joli balancement en ternaire !',
    '🎶 Un, deux, trois, un, deux, trois : ça roule comme un shuffle.',
  ]],
  [(c) => c.meter === '3/4' && c.score >= 8, [
    '🎶 Un, deux, trois… la valse te va bien.',
    '🎶 Trois temps parfaitement tournés : on danse ?',
  ]],
  [(c) => c.laps >= 8, [
    '🔁 Quelle endurance ! Tes doigts méritent une petite pause.',
    '🔁 Autant de tours d\'affilée : c\'est ça, le vrai travail de bassiste.',
    '🔁 Marathon de basse terminé ! Pense à t\'étirer les doigts.',
  ]],
  [(c) => c.hour >= 23 || c.hour < 6, [
    '🌙 À cette heure-ci ? Tes voisins te remercient d\'avoir choisi la basse et pas la batterie.',
    '🌙 Séance de nuit : les meilleures lignes naissent après minuit.',
    '🌙 Il est tard : la basse, elle, ne dort jamais.',
  ]],
  [(c) => c.record && c.record.previous == null, [
    '📝 Première partie sur cet exercice : voilà le record à battre.',
    '📝 Premier essai noté. La prochaine fois, on le bat.',
    '📝 C\'est le début d\'une belle série : note de référence enregistrée.',
  ]],
];

const pickOne = (lines) => lines[Math.floor(Math.random() * lines.length)];

export function verdict(score) {
  const [, emoji, lines] = MESSAGES.find(([min]) => score >= min);
  return { emoji, text: pickOne(lines) };
}

// Remarques adaptées à la partie. context : { score, notes, missedPct, pitchPct, rhythmPct, lean, record,
// stopped, expert, improving, declining, tempo, meter, laps, hour }.
export const situationTips = (context, max = 2) => SITUATIONS
  .filter(([when]) => when(context))
  .slice(0, max)
  .map(([, lines]) => pickOne(lines));

// Écran de fin : la note monte jusqu'à son score, un mot d'encouragement ou de félicitations,
// des remarques selon la situation, des confettis de notes pour les belles parties.
// options : { title, record, tours (notes des tours), stopped, tempo, meter, onReplay }.
export function showResult(summary, { title = 'Fin de la partie', record = null, tours = null, stopped = false, tempo = 100, meter = null, onReplay } = {}) {
  document.querySelector('.game-result')?.remove();
  const { emoji, text } = verdict(summary.score);
  const laps = tours ?? [];
  const tips = situationTips({
    ...summary,
    missedPct: summary.notes ? (summary.missed / summary.notes) * 100 : 0,
    record,
    stopped,
    expert: Number(settings.pitch) <= 6 || settings.rhythm <= 15,
    improving: laps.length >= 2 && laps.at(-1) - laps[0] >= 1.5,
    declining: laps.length >= 2 && laps[0] - laps.at(-1) >= 1.5,
    tempo,
    meter,
    laps: laps.length,
    hour: new Date().getHours(),
  });
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const root = el('div', `game-result${summary.score >= 8 ? ' great' : summary.score < 4 ? ' low' : ''}`);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', title);
  const card = el('div', 'game-card');
  const value = el('span', 'game-value', '0');
  const scoreLine = el('div', 'game-score');
  scoreLine.append(value, el('small', null, ' / 10'));
  // Deux blocs : la note (à gauche en paysage) et le détail (à droite).
  const main = el('div', 'game-main');
  const side = el('div', 'game-side');
  main.append(el('div', 'game-emoji', emoji), el('p', 'game-title', title), scoreLine, el('p', 'game-text', text));
  for (const tip of tips) side.append(el('p', 'game-tip', tip));
  card.append(main, side);

  const details = el('ul', 'game-details');
  const item = (t) => details.append(el('li', null, t));
  if (summary.pitchPct != null) item(`🎯 Justesse : ${summary.pitchPct} % de notes justes`);
  item(`🥁 Rythme : ${summary.rhythmPct} % de notes en place`);
  if (summary.lean != null && Math.abs(summary.lean) >= 10) {
    item(`⏱ Tu joues en moyenne ${Math.round(Math.abs(summary.lean))} ms ${summary.lean > 0 ? 'en retard' : 'en avance'}`);
  }
  if (summary.missed) item(`🔇 ${summary.missed} note${summary.missed > 1 ? 's' : ''} non jouée${summary.missed > 1 ? 's' : ''} sur ${summary.notes}`);
  if (tours?.length > 1) item(`🔁 Tours : ${tours.map(formatScore).join(' · ')}`);
  if (record) item(record.isNew ? `🏅 Nouveau record ! (ancien : ${formatScore(record.previous)})` : `🏅 Record : ${formatScore(record.best)} / 10`);
  side.append(details);

  const actions = el('div', 'game-actions');
  const again = el('button', 'primary', '↻ Rejouer');
  const close = el('button', null, 'Fermer');
  const dismiss = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  again.addEventListener('click', () => { dismiss(); onReplay?.(); });
  close.addEventListener('click', dismiss);
  root.addEventListener('click', (e) => { if (e.target === root) dismiss(); });
  document.addEventListener('keydown', onKey);
  actions.append(close, again);
  side.append(actions);
  root.append(card);

  // Confettis de notes pour les belles parties.
  if (summary.score >= 8) {
    for (let i = 0; i < 28; i++) {
      const c = el('span', 'game-confetti', ['🎵', '🎶', '✨', '🎸'][i % 4]);
      c.style.left = `${Math.random() * 100}%`;
      c.style.animationDelay = `${Math.random() * 1.2}s`;
      c.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
      c.style.fontSize = `${14 + Math.random() * 14}px`;
      root.append(c);
    }
  }
  document.body.append(root);
  again.focus({ preventScroll: true });   // sans faire défiler : la note reste en vue

  // La note défile de 0 jusqu'au score.
  const target = summary.score;
  const start = performance.now(), duration = 900 + target * 60;
  const tickValue = (now) => {
    const k = Math.min(1, (now - start) / duration);
    value.textContent = formatScore(Math.round(target * (1 - (1 - k) ** 3) * 10) / 10);
    if (k < 1) requestAnimationFrame(tickValue);
    else root.classList.add('done');
  };
  requestAnimationFrame(tickValue);
}
