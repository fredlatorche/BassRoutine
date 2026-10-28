// Tablature de basse 4 cordes : notes placées selon leur position réelle dans la mesure,
// défilement continu derrière une tête de lecture. En option, la portée en clé de fa au-dessus.

import { NAMES } from './theory.js';
import { STAFF_H, renderStaff, clefSvg, clefWidth } from './staff.js';

const STRINGS = [43, 38, 33, 28];   // G, D, A, E (de haut en bas, comme sur une tab)
const BEAT_W = 60;                  // largeur d'un temps en pixels
const MAX_FRET = 20;

// Choix des cases : on reste près de la position de la main, les cordes à vide sont « gratuites ».
// Les exercices de gammes fournissent leur propre doigté (string, fret, finger).
function fingerings(events) {
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
  let track, playhead, cueMark, notes = [], events = [], current = -1, cueX = 0;
  let showStaff = false, lastArgs = null, loop = 0, fifths = 0;

  // Un clic (ou un tap, pas un glissé) choisit le point de départ.
  container.addEventListener('click', (e) => {
    const x = e.clientX - container.getBoundingClientRect().left + container.scrollLeft;
    const beat = Math.max(0, x / BEAT_W);
    onSeek?.(loop ? beat % loop : beat);   // un clic dans une copie de la boucle vise la même mesure
  });

  // loopLen : longueur de la boucle en temps (0 = pas de boucle). En boucle, on affiche la séquence
  // deux fois puis le début d'une troisième, séparées par des doubles traits, pour voir la suite.
  function render(evts, totalBeats, beatsPerBar, { loopLen = 0 } = {}) {
    lastArgs = [evts, totalBeats, beatsPerBar, { loopLen }];
    loop = loopLen;
    const basePos = fingerings(evts);   // même doigté pour toutes les copies
    let pos = basePos, doubles = [];
    if (loopLen) {
      const head = Math.min(loopLen, Math.ceil(container.clientWidth / BEAT_W) + beatsPerBar);
      const shown = [];
      pos = [];
      for (let k = 0; k < 3; k++) {
        evts.forEach((e, i) => {
          if (k === 2 && e.t >= head) return;
          shown.push({ ...e, t: e.t + k * loopLen });
          pos.push(basePos[i]);
        });
      }
      evts = shown;
      totalBeats = 2 * loopLen + head;
      doubles = [loopLen, 2 * loopLen];
    }
    events = evts;
    current = -1;
    lit = -1;
    const off = showStaff ? STAFF_H : 0;   // la tab descend sous la portée
    track = document.createElement('div');
    track.className = 'tab-track';
    track.style.width = `${totalBeats * BEAT_W + 8}px`;
    track.style.height = `${140 + off}px`;

    const staff = showStaff ? renderStaff(events, totalBeats, beatsPerBar, BEAT_W, doubles) : null;
    if (staff) track.append(staff.svg);

    for (let s = 0; s < STRINGS.length; s++) {
      const line = document.createElement('div');
      line.className = 'tab-line';
      line.style.top = `${30 + off + s * 24}px`;
      track.append(line);
    }

    for (let b = 0; b * beatsPerBar < totalBeats; b++) {
      const bar = document.createElement('div');
      bar.className = 'tab-bar';
      bar.style.left = `${b * beatsPerBar * BEAT_W}px`;
      bar.style.top = `${4 + off}px`;
      bar.textContent = loopLen ? (b % (loopLen / beatsPerBar)) + 1 : b + 1;   // numéros repartis à 1 à chaque passage
      if (doubles.includes(b * beatsPerBar)) bar.classList.add('double');
      track.append(bar);
    }

    notes = events.map((e, i) => {
      const x = e.t * BEAT_W + 6;
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
      name.textContent = e.name ?? NAMES[e.midi % 12];
      track.append(el, name);
      return staff ? [el, name, staff.groups[i]] : [el, name];
    });

    playhead = document.createElement('div');
    playhead.className = 'tab-playhead';
    playhead.hidden = true;
    cueMark = document.createElement('div');
    cueMark.className = 'tab-cue';
    track.append(cueMark, playhead);

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
      container.scrollTo({ left: Math.max(0, cueX - container.clientWidth / 3), behavior: 'smooth' });
      return;
    }
    const x = beat * BEAT_W;
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
    cueX = beat * BEAT_W;
    if (!cueMark) return;
    cueMark.style.left = `${cueX}px`;
    cueMark.hidden = beat === 0;
  }

  // Clé et armure dans la colonne de gauche.
  function drawClef() {
    if (!labels) return;
    labels.querySelector('.staff-clef')?.remove();
    labels.style.width = showStaff ? `${clefWidth(fifths)}px` : '';
    if (showStaff) labels.prepend(clefSvg(fifths));
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
    setCue(cueX / BEAT_W);
  }

  return { render, follow, setCue, setStaff, setKey };
}
