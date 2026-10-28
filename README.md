# BassRoutine

Outil pour travailler la basse : lignes de basse jouées par le synthé, tempo réglable,
accords, batterie et tablature qui défile. C'est une application web (PWA) qui tourne
dans le navigateur sur Mac, iPhone et Android.

## Lancer l'app

```bash
python3 serve.py
```

Puis ouvrir http://localhost:8000. Le script affiche aussi l'adresse à taper sur l'iPhone
(même Wi-Fi).

## Fonctionnalités

- **Mode Boucle** : grille éditable de 4 à 16 mesures, une note par temps, plus des lignes
  prêtes à l'emploi (Mi par temps, fondamentale-quinte, walking simple).
- **Mode Morceau** : grilles complètes (So What, Blues en F, Autumn Leaves) sur 1 à 4 chorus,
  avec une ligne de basse **générée** en 4 styles : walking swing, two-feel, bossa, croches.
- **Import MIDI** : jouer et afficher en tab la ligne de basse d'un fichier `.mid`
  (choix de la piste, autres pistes et batterie du fichier).
- **Accords** (piano électrique, nappe, vibraphone), **batterie** synthétisée adaptée
  au style, **métronome**.
- **Tablature 4 cordes** avec noms des notes, défilement continu, et clic pour choisir
  la mesure de départ.

Les lignes de basse des morceaux sont générées sur les grilles d'accords : ce ne sont pas
des transcriptions d'enregistrements.

## Organisation

| Fichier | Rôle |
|---|---|
| `web/index.html`, `web/style.css` | Interface |
| `web/app.js` | Lecteur, sons et contrôles |
| `web/theory.js` | Notes, accords, gammes |
| `web/songs.js` | Grilles des morceaux |
| `web/walking.js` | Générateur de lignes de basse |
| `web/drums.js` | Batterie et rythmes |
| `web/tab.js` | Tablature |
| `web/midi-import.js` | Lecture des fichiers MIDI |
| `web/sw.js`, `web/manifest.json` | Mode application / hors ligne |
| `serve.py` | Serveur local sans cache |
| `basse.swift` | Premier prototype (macOS, ligne de commande) |

## Bibliothèques

- [Tone.js](https://tonejs.github.io/) 14.8.49 (licence MIT), dans `web/vendor/Tone.js`
- [@tonejs/midi](https://github.com/Tonejs/Midi) 2.0.28 (licence MIT), dans `web/vendor/Midi.js`
