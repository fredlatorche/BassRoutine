// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Tablature de basse 4 cordes : notes placées selon leur position réelle dans la mesure,
// défilement continu derrière une tête de lecture. En option, la portée en clé de fa au-dessus.

import { NAMES } from './theory.js';
import { STAFF_H, renderStaff, clefSvg, clefWidth } from './staff.js';
import { noteLabel } from './notation.js';
import { lineFingering } from './scales.js';

const STRINGS = [43, 38, 33, 28];   // G, D, A, E (de haut en bas, comme sur une tab)
const BEAT_W = 60;                  // largeur d'un temps en pixels (minimum)
const NOTE_W = 36;                  // place nécessaire pour une case à 2 chiffres + le numéro de doigt
const MAX_BEAT_W = 150;

const NOTE_X = 20;      // centre d'une note en début de mesure, après la barre (place pour une altération)
const BAR_GAP = 26;     // espace minimal entre la dernière note d'une mesure et la barre suivante

// Plus petit écart entre deux notes (en temps, au plus 1).
function minGap(events) {
  let gap = 1;
  for (let i = 1; i < events.length; i++) {
    const d = events[i].t - events[i - 1].t;
    if (d > 0.01 && d < gap) gap = d;
  }
  return gap;
}

// Largeur d'un temps : élargie quand les notes sont serrées (triolets, doubles croches),
// pour que les numéros de case ne se chevauchent pas.
function beatWidth(events) {
  return Math.min(MAX_BEAT_W, Math.max(BEAT_W, Math.ceil(NOTE_W / minGap(events))));
}
const MAX_FRET = 20;

// Choix des cases : on reste près de la position de la main, les cordes à vide sont « gratuites ».
// Les exercices de gammes fournissent leur propre doigté (string, fret, finger).
// withFingers : doigté calculé pour les autres exercices aussi (cases choisies en position).
function fingerings(events, withFingers) {
  if (withFingers && events.some((e) => e.fret == null)) {
    const line = lineFingering(events.map((e) => e.midi));
    return events.map((e, i) => (e.fret != null ? { string: e.string, fret: e.fret, finger: e.finger } : line[i]));
  }
  let hand = 2;
  return events.map((e) => {
    if (e.fret != null) return { string: e.string, fret: e.fret, finger: e.finger };
    const midi = e.midi < STRINGS[3] ? e.midi + 12 : e.midi;   // trop grave pour une 4 cordes : octave au-dessus
    let best = null;
    STRINGS.forEach((open, s) => {
      const fret = midi - open;
      if (fret < 0 || fret > MAX_FRET) return;
      const cost = fret === 0 ? 0.5 : Math.abs(fret - hand) + (fret > 12 ? 2 : 0);
      if (!best || cost < best.cost) best = { string: s, fret, cost };
    });
    if (best && best.fret > 0) hand = best.fret;
    return best;
  });
}

// onSeek(temps) est appelé quand on touche / clique la tab ; labels : colonne des noms de cordes.
export function createTab(container, { onSeek, labels } = {}) {
  let track, playhead, cueMark, rangeMark, notes = [], events = [], current = -1, cueBeat = 0;
  let range = null;   // mesures sélectionnées à travailler : { start, end } en temps
  let bw = BEAT_W;   // largeur d'un temps pour l'affichage en cours
  // Abscisse du centre d'une note : espacement régulier dans la mesure, très légèrement resserré
  // si besoin pour laisser de l'air avant la barre de mesure suivante (notes rapides).
  let xAt = (t) => t * bw + NOTE_X;
  let showStaff = false, everyAccidental = false, showFingers = false, lastArgs = null, starts = [], fifths = 0, meter = '4/4';

  // Un clic (ou un tap, pas un glissé) choisit le point de départ.
  container.addEventListener('click', (e) => {
    const box = container.getBoundingClientRect();
    const zoom = box.width / container.offsetWidth || 1;   // tab agrandie (téléphone en paysage)
    const x = (e.clientX - box.left) / zoom + container.scrollLeft;
    const beat = Math.max(0, x / bw);
    // Un clic dans une copie de la boucle (ou une autre partie enchaînée) vise la même place dans sa partie.
    const start = starts.findLast((b) => b <= beat) ?? 0;
    onSeek?.(beat - start);
  });

  // loopLen : longueur de la boucle en temps (0 = pas de boucle). En boucle, on affiche la séquence
  // deux fois puis le début d'une troisième, séparées par des doubles traits, pour voir la suite.
  // parts : séquences différentes [{ events, beats }] à mettre bout à bout à la place des copies
  // (improvisations ou gammes enchaînées), la dernière coupée comme la 3e copie.
  // pulse : durée d'un temps en noires (1,5 en 6/8 et 12/8), pour l'écriture sur la portée ;
  // timeSig : chiffrage de la mesure affiché après la clé (« 4/4 », « 6/8 »…) ;
  // final : barre de fin (trait fin + trait épais) après la dernière mesure, quand l'exercice ne boucle pas.
  function render(evts, totalBeats, beatsPerBar, { loopLen = 0, parts = null, pulse = 1, timeSig = '4/4', final = false } = {}) {
    lastArgs = [evts, totalBeats, beatsPerBar, { loopLen, parts, pulse, timeSig, final }];
    final = final && !loopLen && !parts;
    if (timeSig !== meter) {
      meter = timeSig;
      drawClef();
    }
    bw = beatWidth(parts ? parts.flatMap((p) => p.events) : evts);
    const last = beatsPerBar - minGap(evts);   // position de la dernière note possible dans une mesure
    const squeeze = Math.min(1, (beatsPerBar * bw - BAR_GAP - NOTE_X) / (last * bw || 1));
    xAt = (t) => {
      const b = Math.floor((t + 1e-6) / beatsPerBar);
      return b * beatsPerBar * bw + NOTE_X + (t - b * beatsPerBar) * bw * squeeze;
    };
    let pos = fingerings(evts, showFingers), doubles = [];
    starts = [];
    if (loopLen) parts = [0, 1, 2].map(() => ({ events: evts, beats: loopLen, pos }));   // même doigté pour toutes les copies
    if (parts) {
      const shown = [];
      let start = 0;
      pos = [];
      parts.forEach((part, k) => {
        const last = k === 2;
        const end = last ? Math.min(part.beats, Math.ceil(container.clientWidth / bw) + beatsPerBar) : part.beats;
        const partPos = part.pos ?? fingerings(part.events, showFingers);
        part.events.forEach((e, i) => {
          if (e.t >= end) return;
          shown.push({ ...e, t: e.t + start });
          pos.push(partPos[i]);
        });
        starts.push(start);
        start += end;
      });
      evts = shown;
      totalBeats = start;
      doubles = starts.slice(1);
    }
    events = evts;
    current = -1;
    lit = -1;
    const off = showStaff ? STAFF_H : 0;   // la tab descend sous la portée
    track = document.createElement('div');
    track.className = 'tab-track';
    track.style.width = `${totalBeats * bw + 8}px`;
    track.style.height = `${140 + off}px`;

    const staff = showStaff ? renderStaff(events, totalBeats, beatsPerBar, bw, doubles, everyAccidental, xAt, pulse, final, !!loopLen) : null;
    if (staff) track.append(staff.svg);

    for (let s = 0; s < STRINGS.length; s++) {
      const line = document.createElement('div');
      line.className = 'tab-line';
      line.style.top = `${30 + off + s * 24}px`;
      track.append(line);
    }

    if (final) {
      const end = document.createElement('div');
      end.className = 'tab-bar final';
      end.style.left = `${totalBeats * bw - 5}px`;
      end.style.top = `${4 + off}px`;
      track.append(end);
    }
    for (let b = 0; b * beatsPerBar < totalBeats; b++) {
      const bar = document.createElement('div');
      bar.className = 'tab-bar';
      bar.style.left = `${b * beatsPerBar * bw}px`;
      bar.style.top = `${4 + off}px`;
      // Numéros repartis à 1 à chaque passage (ou partie enchaînée).
      bar.textContent = (b * beatsPerBar - (starts.findLast((x) => x <= b * beatsPerBar) ?? 0)) / beatsPerBar + 1;
      const x = b * beatsPerBar * bw;
      if (loopLen && (b === 0 || doubles.includes(b * beatsPerBar))) {
        // Boucle : signes de reprise, comme sur la portée (début « ‖: », puis « :‖: » à chaque retour).
        bar.classList.add('repeat');
        const sign = document.createElement('div');
        sign.className = b === 0 ? 'tab-repeat start' : 'tab-repeat';
        sign.style.left = `${b === 0 ? x : x - 6}px`;
        sign.style.top = `${4 + off}px`;
        for (const dx of b === 0 ? [11.5] : [-10, 9.5]) {
          for (const y of [42, 90]) {
            const dot = document.createElement('i');
            dot.style.left = `${(b === 0 ? 0 : 6) + dx - 2}px`;
            dot.style.top = `${y - 4 - 2}px`;
            sign.append(dot);
          }
        }
        track.append(sign);
      } else if (doubles.includes(b * beatsPerBar)) bar.classList.add('double');
      track.append(bar);
    }

    notes = events.map((e, i) => {
      const x = xAt(e.t) - 6;   // aligné sous la tête de note de la portée
      const el = document.createElement('b');
      el.className = 'tab-note';
      el.style.left = `${x}px`;
      el.style.top = `${30 + off + (pos[i]?.string ?? 3) * 24}px`;
      el.textContent = pos[i]?.fret ?? '?';
      if (pos[i]?.finger != null) {
        const finger = document.createElement('sup');
        finger.textContent = pos[i].finger;
        finger.title = pos[i].finger === 0 ? 'corde à vide' : `doigt ${pos[i].finger}`;
        el.append(finger);
      }
      const name = document.createElement('span');
      name.className = 'tab-name';
      name.style.left = `${x}px`;
      name.style.top = `${118 + off}px`;
      name.textContent = noteLabel(e.name ?? NAMES[e.midi % 12]);
      track.append(el, name);
      return staff ? [el, name, staff.groups[i]] : [el, name];
    });

    playhead = document.createElement('div');
    playhead.className = 'tab-playhead';
    playhead.hidden = true;
    cueMark = document.createElement('div');
    cueMark.className = 'tab-cue';
    rangeMark = document.createElement('div');
    rangeMark.className = 'tab-range';
    track.append(rangeMark, cueMark, playhead);
    drawRange();

    container.replaceChildren(track);
    container.scrollLeft = 0;
  }

  // Position de lecture en temps (nombre à virgule) ; null = arrêt.
  function follow(beat) {
    if (!track) return;
    if (beat == null) {
      playhead.hidden = true;
      current = -1;
      setCurrent(-1);
      container.scrollTo({ left: Math.max(0, cueBeat * bw - container.clientWidth / 3), behavior: 'smooth' });
      return;
    }
    const x = beat * bw;
    playhead.hidden = false;
    playhead.style.left = `${x}px`;
    container.scrollLeft = Math.max(0, x - container.clientWidth / 3);

    // Note en cours : la dernière commencée avant la tête de lecture (events triés par t).
    let i = current;
    if (i >= 0 && events[i].t > beat) i = -1;   // retour au début (boucle)
    while (i + 1 < events.length && events[i + 1].t <= beat) i++;
    current = i;
    setCurrent(i >= 0 && beat < events[i].t + Math.max(events[i].dur, 0.25) ? i : -1);
  }

  let lit = -1;
  function setCurrent(i) {
    if (i === lit) return;
    if (lit >= 0) notes[lit]?.forEach((el) => el.classList.remove('playing'));
    if (i >= 0) notes[i]?.forEach((el) => el.classList.add('playing'));
    lit = i;
  }

  // Repère du point de départ (en temps).
  function setCue(beat) {
    cueBeat = beat;
    if (!cueMark) return;
    cueMark.style.left = `${beat * bw}px`;
    cueMark.hidden = beat === 0 && !range;
  }

  // Zone surlignée des mesures sélectionnées (null = pas de sélection).
  function setRange(r) {
    range = r;
    drawRange();
    setCue(cueBeat);
  }

  function drawRange() {
    if (!rangeMark) return;
    rangeMark.hidden = !range;
    if (!range) return;
    rangeMark.style.left = `${range.start * bw}px`;
    rangeMark.style.width = `${(range.end - range.start) * bw}px`;
  }

  // Clé et armure dans la colonne de gauche.
  function drawClef() {
    if (!labels) return;
    labels.querySelector('.staff-clef')?.remove();
    labels.style.width = showStaff ? `${clefWidth(fifths, meter)}px` : '';
    if (showStaff) labels.prepend(clefSvg(fifths, meter));
  }

  // Armure affichée (nombre de dièses > 0 ou de bémols < 0).
  function setKey(f) {
    if (f === fifths) return;
    fifths = f;
    drawClef();
  }

  // Affiche ou masque la portée (clé de fa) au-dessus de la tab.
  function setStaff(on) {
    showStaff = on;
    if (labels) {
      labels.style.setProperty('--off', `${on ? STAFF_H : 0}px`);
      labels.classList.toggle('with-staff', on);
      drawClef();
    }
    const scroll = container.scrollLeft;
    if (lastArgs) render(...lastArgs);
    container.scrollLeft = scroll;
    setCue(cueBeat);
  }

  // Redessine avec les mêmes données (changement de notation des noms de notes…).
  function redraw() {
    if (!lastArgs) return;
    const scroll = container.scrollLeft;
    render(...lastArgs);
    container.scrollLeft = scroll;
    setCue(cueBeat);
  }

  // Mode novice : altération écrite sur chaque note de la portée.
  function setEveryAccidental(on) {
    everyAccidental = on;
    if (!showStaff || !lastArgs) return;
    const scroll = container.scrollLeft;
    render(...lastArgs);
    container.scrollLeft = scroll;
    setCue(cueBeat);
  }

  // Doigts affichés sur tous les exercices (les gammes ont toujours le leur).
  function setFingers(on) {
    showFingers = on;
    redraw();
  }

  // Mode Jeu : couleur d'une note jugée (cls : 'hit', 'near' ou 'miss'), repérée par sa position (en temps).
  function mark(beat, cls) {
    const i = events.findIndex((e) => Math.abs(e.t - beat) < 1e-3);
    if (i < 0) return;
    for (const node of notes[i]) {
      node.classList.remove('g-hit', 'g-near', 'g-miss');
      node.classList.add(`g-${cls}`);
    }
  }
  function clearMarks() {
    track?.querySelectorAll('.g-hit, .g-near, .g-miss').forEach((n) => n.classList.remove('g-hit', 'g-near', 'g-miss'));
  }

  return { render, follow, setCue, setRange, setStaff, setKey, setEveryAccidental, setFingers, redraw, mark, clearMarks };
}
