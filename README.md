# Bass Routine

Une application pour travailler la basse : des lignes de basse jouées par le synthé,
avec accords, batterie, tablature qui défile et partition en clé de fa.
Elle s'ouvre dans le navigateur, sur ordinateur (Mac, Windows), iPhone et Android,
et s'installe comme une application.

En résumé : un groupe entier qui joue avec vous, ne se plaint jamais du tempo,
ne rate aucune répétition et ne vous demande pas de porter l'ampli.

## Ouvrir l'app

👉 **https://fredlatorche.github.io/BassRoutine/**

Pour l'installer :

- **iPhone / iPad** : ouvrir le lien dans Safari, puis *Partager → Sur l'écran d'accueil*.
- **Android** : ouvrir le lien dans Chrome, puis *Installer l'application*.
- **Ordinateur** : dans Chrome ou Edge, cliquer sur l'icône *Installer* dans la barre d'adresse.

Une fois installée, l'app fonctionne aussi hors connexion. Même au fond d'une cave de répétition.

## Trois façons de travailler

### Boucle

- Lignes prêtes à l'emploi : Mi par temps, fondamentale-quinte, walking simple,
  walking blues en Mi, walking ii-V-I en Sol, et une walking dans l'aigu pensée pour la fretless.
- 🎲 **Inventer** : une grille d'accords typique (I–vi–ii–V, ii–V–I, i–iv–ii°–V…) et une
  walking bass qui tourne en boucle dessus, dans une tonalité au choix ou au hasard,
  en majeur ou en mineur, en grave ou en aigu. Chaque clic propose une nouvelle ligne,
  même pendant la lecture.
- Boucles de 4, 8, 16 ou 32 mesures, notes et accords modifiables dans la grille.
  (32 mesures de Mi par temps : idéal pour vérifier sa patience.)
- En boucle, la tablature montre déjà le début du tour suivant après un double trait.

### Morceau

- Grilles complètes de standards (So What, Blues en F, Autumn Leaves), de 1 à 4 chorus.
- Ligne de basse **générée** en 4 styles : walking swing (avec croches et triolets),
  two-feel, bossa, croches pop/rock. « Nouvelle ligne » en propose une autre.
- **Import MIDI** : jouer et lire en tab la ligne de basse d'un fichier `.mid`
  (choix de la piste, autres pistes et batterie du fichier).

Les lignes des morceaux sont générées sur les grilles d'accords : ce ne sont pas
des transcriptions d'enregistrements.

### Gammes

- Majeure, mineure naturelle, mineure harmonique, pentatoniques majeure et mineure,
  dans les 12 tonalités ou enchaînées par le cycle des quartes.
- Sur 1 ou 2 octaves ou tout le manche, en montant, en descendant ou aller-retour,
  en noires, croches ou triolets.
- Trois doigtés : **3 notes par corde**, **en position** (le moins de déplacements de main),
  ou par **boxes** (5 en pentatonique, 7 sinon), avec le choix de la zone du manche
  (grave, médium, aiguë) et les cordes à vide quand c'est possible.
- Le numéro du doigt est indiqué à côté de chaque case.

## Accompagnement

- **Accords** : piano électrique, nappe, vibraphone, cordes, cuivres, flûtes, orgue, guitare jazz.
- **Batterie** : 10 rythmes (swing, balais, two-feel, shuffle, bossa nova, rock, pop/disco,
  funk, half-time, reggae), réglage automatique selon le style, et petits breaks toutes les 4 mesures.
  Un batteur qui reste en place : c'est déjà la moitié du travail du bassiste.
- **Métronome**.

## Tablature et partition

- Tablature 4 cordes qui défile pendant la lecture, avec le nom des notes.
- **Travailler un passage** : toucher la tab place le début ; avec « Fin ◀ », on choisit
  la dernière mesure et la sélection tourne en boucle (✕ pour l'effacer).
- **Partition en clé de fa** au-dessus de la tab (option) : armure de la tonalité,
  altérations écrites selon les règles (bémols en Mi♭, dièses en Sol…), croches ligaturées,
  triolets. Un **mode novice** répète l'altération sur chaque note.

## Réglages (roue ⚙️)

- 7 thèmes de couleurs (Nuit, Noir, Bois, Océan, Forêt, Violet, Clair).
- Noms des notes en français (Do, Ré, Mi) ou en notation américaine (C, D, E).
- Volume séparé pour la basse, les accords, la batterie, le métronome et les autres pistes.

Tous les choix (mode, tempo, sons, gammes, boucle inventée…) sont retenus d'une visite à l'autre
sur chaque appareil.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `web/index.html`, `web/style.css` | Interface et thèmes |
| `web/app.js` | Lecteur, sons, réglages et mémoire des choix |
| `web/theory.js` | Notes, accords, gammes associées |
| `web/spelling.js` | Orthographe des notes et armures |
| `web/notation.js` | Noms des notes (français / américain) |
| `web/songs.js` | Grilles des morceaux |
| `web/walking.js` | Générateur de lignes de basse |
| `web/random-loop.js` | Mode 🎲 Inventer |
| `web/scales.js` | Gammes et doigtés |
| `web/drums.js` | Batterie et rythmes |
| `web/tab.js` | Tablature |
| `web/staff.js` | Partition en clé de fa |
| `web/midi-import.js` | Lecture des fichiers MIDI |
| `web/sw.js`, `web/manifest.json` | Installation et mode hors ligne |
| `serve.py` | Serveur local pour le développement |
| `basse.swift` | Premier prototype (macOS, ligne de commande) |

## Bibliothèques

- [Tone.js](https://tonejs.github.io/) 14.8.49 (licence MIT), dans `web/vendor/Tone.js`
- [@tonejs/midi](https://github.com/Tonejs/Midi) 2.0.28 (licence MIT), dans `web/vendor/Midi.js`

## Le mot de la fin

La basse ne va pas se travailler toute seule.
**Plus d'excuses : au boulot !**
