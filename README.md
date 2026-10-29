# Bass Routine

Une application pour travailler la basse : des lignes de basse jouées par le synthé,
avec accords, batterie, tablature qui défile et partition en clé de fa.
Elle écoute aussi votre basse : un accordeur, et un mode où le curseur attend la bonne note.
Elle s'ouvre dans le navigateur, sur ordinateur (Mac, Windows), iPhone et Android,
et s'installe comme une application.

En résumé : un groupe entier qui joue avec vous, ne se plaint jamais du tempo,
ne rate aucune répétition et ne vous demande pas de porter l'ampli.

**Version 2.0** : l'app peut désormais faire jouer l'accompagnement par vos propres instruments
MIDI (synthés, boîte à rythmes, Ableton Live, GarageBand) : voir [Jouer avec ses instruments MIDI](#jouer-avec-ses-instruments-midi).

🎯 **Fretless : l'app vous écoute et vous dit si vous jouez juste.** Branchez la basse, et le curseur
n'avance que sur la bonne note, jouée assez juste : à ± 50, 25, 12 ou 6 cents selon le niveau choisi,
avec l'écart affiché en direct (« +14 c, trop haut »). De quoi affiner sa justesse note après note,
sans frettes pour tricher : voir [Affiner sa justesse sur une fretless](#affiner-sa-justesse-sur-une-fretless).

🎸 **Accordeur intégré** : un pictogramme diapason dans l'en-tête, en mode automatique ou corde par corde :
voir [Accordeur](#accordeur).

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
  en majeur ou en mineur, en grave, en aigu ou sur tout le manche (la ligne monte
  vers le milieu de la boucle puis redescend). Chaque clic propose une nouvelle ligne,
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

## Accordeur

Le pictogramme **diapason**, à côté de la roue ⚙️, ouvre un accordeur (même entrée audio que
le mode attente : interface audio ou micro).

- **Auto** : l'accordeur reconnaît la note jouée et indique l'écart avec la plus proche.
- **Corde par corde** : on choisit la corde à accorder (Mi, La, Ré, Sol) ; l'aiguille mesure l'écart
  avec cette corde, même de loin (« bien trop bas de 2 demi-tons : tends la corde »).
- Cadran de −50 à +50 cents, fréquence en Hz, et « Juste ! » à ± 3 cents.
- Diapason de référence réglable (La = 440 Hz par défaut, de 430 à 450 Hz).
- Ouvrir l'accordeur arrête la lecture ; Échap ou un clic en dehors le referme.
- L'entrée audio et le seuil se règlent dans ⚙️ → **Entrée audio**. Avec une interface audio,
  l'accordeur n'entend que la basse ; avec un micro, mieux vaut une pièce calme.

## ⏸ Attendre ma note

Pour travailler sans pression de tempo : cocher **⏸ Attendre ma note** (bloc Accompagnement)
puis Play. Le curseur reste sur la note à jouer tant qu'elle n'est pas entendue, puis passe
à la suivante. Marche dans les trois modes (Boucle, Morceau, Gammes), avec la sélection de mesures.

- **Entrée** : la basse branchée dans une interface audio (le plus fiable), ou le micro de
  l'ordinateur ou du téléphone. Le navigateur demande l'accès la première fois.
- La note doit être **exacte, octave comprise** : la même que dans la tab.
- **Justesse** réglable (⚙️ → Entrée audio) : Large (± 50 cents, la note la plus proche), Moyen (± 25),
  **Précis (± 12, recommandé et réglé par défaut)** ou Très précis (± 6), pour travailler la justesse sur une fretless.
- En haut de la tab : la note attendue ; en rouge la note entendue si elle est fausse, en orange
  l'écart en cents si elle est un peu trop haute ou trop basse. Sur une fretless, on peut corriger
  en glissant sans rejouer : la note est validée dès qu'elle est assez juste.
- Pas d'accompagnement pendant l'attente (ni batterie, ni accords, ni métronome).
- Réglages ⚙️ → **Entrée audio** : choix de l'entrée (interface audio, micro…), justesse, **seuil** de niveau
  (à monter si des bruits ou des cordes qui résonnent sont pris pour des notes) et vumètre.

Une même note rejouée est reconnue à sa nouvelle attaque. Avec un micro, mieux vaut une pièce calme.

### Affiner sa justesse sur une fretless

Sur une fretless, trouver la note ne suffit pas : il faut la poser juste, et l'oreille
s'habitue vite à « presque juste ». Ici, c'est l'app qui tranche, au cent près, sans fatigue
ni complaisance.

- **Un écart mesuré, pas deviné** : à chaque note, l'app affiche de combien vous êtes trop haut
  ou trop bas (en cents, un centième de demi-ton). On sait tout de suite s'il faut avancer
  ou reculer le doigt, et de combien.
- **Corriger en glissant** : si la note est un peu fausse, pas besoin de la rejouer. On glisse
  le doigt en écoutant, et la note est validée à l'instant où elle entre dans la tolérance :
  l'oreille et la main apprennent ensemble où se trouve la bonne place.
- **Quel niveau viser ?** *Précis* (± 12 cents, le réglage par défaut) : c'est la justesse qui passe
  inaperçue en jeu de groupe. *Moyen* (± 25) sert à débuter : l'écart s'entend encore, surtout sur une
  note tenue. *Très précis* (± 6), la précision d'un accordeur, pour les notes longues, les positions
  hautes et l'unisson avec un piano.
- **Les exercices s'y prêtent** : les gammes en position (le doigt de chaque note est indiqué),
  la walking aiguë pensée pour la fretless, ou la ligne inventée sur **tout le manche** pour
  travailler la justesse dans les positions hautes, là où les repères manquent.
- **Au-delà des repères** : les points sur le côté de la touche aident à se placer, pas à jouer juste.
  L'app, elle, juge ce qui sonne vraiment.

Sur une basse frettée aussi, le mode attente aide à apprendre les notes et les positions,
mais c'est sur une fretless qu'il prend tout son sens.

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
- **Instruments MIDI** : envoyer la basse, les accords, la batterie ou les autres pistes
  vers vos instruments (voir ci-dessous).
- **Entrée audio** (accordeur et mode attente) : choix de l'entrée (interface audio, micro…),
  justesse demandée, seuil de niveau et vumètre.

Tous les choix (mode, tempo, sons, gammes, boucle inventée, réglages de l'accordeur…) sont retenus
d'une visite à l'autre sur chaque appareil.

## Jouer avec ses instruments MIDI

Sur ordinateur, chaque piste peut être jouée par un instrument MIDI au lieu du son de l'app :
le Moog fait la basse, l'orgue les accords, Ableton la batterie… et vous jouez par-dessus.

**Navigateur** : Chrome ou Edge (le plus simple), ou Firefox. Pas Safari ni iPhone :
l'app y garde ses sons internes.

### Dans l'app

1. Roue ⚙️ → **Instruments MIDI** → **Activer le MIDI**, et accepter la demande du navigateur
   (une seule fois ; Firefox demande d'installer un petit module de permission pour le site,
   et refuse si aucun appareil MIDI n'est branché).
2. Pour chaque piste (Basse, Accords, Batterie, Autres pistes), choisir la **sortie** et le **canal**.
   « Son interne » = le son de l'app. Une piste envoyée en MIDI se tait dans l'app.
3. **Décalage** (ms) : si l'instrument sonne un peu en avance ou en retard sur le métronome
   de l'app, le corriger ici.

La liste des sorties montre les instruments branchés en USB (ou via une interface MIDI)
et le **bus IAC** du Mac, qui mène aux logiciels. Après avoir branché un instrument, recharger la page.

La batterie est envoyée en **General MIDI** (grosse caisse 36, caisse claire 38, charleston 42,
ride 51, crash 49…), à mettre de préférence sur le **canal 10** : les kits d'Ableton et de GarageBand
la jouent tels quels. À Stop, toutes les notes sont coupées.

### Vers Ableton Live (ou GarageBand) sur Mac

1. **Activer le bus IAC** (câble MIDI virtuel du Mac) : application *Configuration audio et MIDI*
   (⌘ Espace), menu *Fenêtre → Afficher le studio MIDI* (⌘ 2), double-clic sur **Gestionnaire IAC**
   (en vue liste ☰ s'il n'apparaît pas), cocher **« Le gestionnaire est en ligne »**, vérifier
   qu'il existe un port « Bus 1 » (sinon **+**), **Appliquer**.
2. **Relancer Ableton** pour qu'il voie le nouveau port, puis *Préférences → Link Tempo MIDI* :
   sur la ligne **Entrée : Gestionnaire IAC (Bus 1)**, activer **Piste**. Laisser la sortie IAC
   désactivée (sinon le MIDI tourne en rond). « Surface de contrôle » : laisser « Aucun ».
3. **Une piste MIDI par instrument** : par exemple un **Drum Rack** avec *MIDI From* =
   Gestionnaire IAC (Bus 1), **Ch. 10**, *Monitor* = **In** ; un piano ou un orgue sur **Ch. 2**
   pour les accords ; un synthé de basse sur **Ch. 1**.
4. Dans l'app, choisir **Gestionnaire IAC Bus 1** pour ces pistes, avec les mêmes canaux. Play.

Ça ne sonne pas ? Le témoin MIDI en haut à droite d'Ableton clignote-t-il pendant la lecture ?
S'il reste éteint, c'est l'étape 1 ou 2 ; s'il clignote, c'est le réglage de la piste (canal, *Monitor*).

### Vers un synthé ou une boîte à rythmes

Brancher l'instrument en USB (ou via une interface MIDI), recharger la page, le choisir comme sortie
et régler le canal sur celui que l'instrument écoute (souvent 1 par défaut). Un synthé monophonique
(Moog Subsequent 37…) est fait pour la basse, un orgue ou un clavier (Hammond SK1…) pour les accords.

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
| `web/midi-out.js` | Sortie vers les instruments MIDI |
| `web/pitch.js` | Entrée audio et reconnaissance des notes jouées |
| `web/tuner.js` | Accordeur |
| `web/tab.js` | Tablature |
| `web/staff.js` | Partition en clé de fa |
| `web/midi-import.js` | Lecture des fichiers MIDI |
| `web/sw.js`, `web/manifest.json` | Installation et mode hors ligne |
| `serve.py` | Serveur local pour le développement |
| `basse.swift` | Premier prototype (macOS, ligne de commande) |

## Bibliothèques

- [Tone.js](https://tonejs.github.io/) 14.8.49 (licence MIT), dans `web/vendor/Tone.js`
- [@tonejs/midi](https://github.com/Tonejs/Midi) 2.0.28 (licence MIT), dans `web/vendor/Midi.js`

## Droits

© 2026 FredLatorche — tous droits réservés. L'app est libre d'utilisation en ligne, mais le code
n'est pas libre de réutilisation : voir [LICENSE](LICENSE). Les empreintes des fichiers de chaque
version publiée sont dans [EMPREINTES.md](EMPREINTES.md).

## Le mot de la fin

La basse ne va pas se travailler toute seule.
**Plus d'excuses : au boulot !**
