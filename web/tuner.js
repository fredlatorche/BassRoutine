// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Accordeur : cadran à aiguille (± 50 cents), deux modes.
// - Auto : la note la plus proche de ce qui est joué.
// - Corde par corde : on choisit la corde (Mi, La, Ré, Sol) et l'aiguille indique l'écart avec elle,
//   même de loin (« trop bas de 2 demi-tons »).
// La hauteur vient de pitch.js (même détection que le mode « Attendre ma note ») : voir listen() dans app.js.

import { noteLabel } from './notation.js';

const NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const STRINGS = [28, 33, 38, 43];   // Mi, La, Ré, Sol (de la plus grave à la plus aiguë)
const IN_TUNE = 3;                  // cents : « juste » pour un accordeur
const KEY = 'bassroutine-tuner';
const SVG = 'http://www.w3.org/2000/svg';

const settings = { mode: 'auto', string: 28, ref: 440 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* stockage indisponible */ }
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
};

const midiOf = (hz) => 69 + 12 * Math.log2(hz / settings.ref);
const hzOf = (midi) => settings.ref * 2 ** ((midi - 69) / 12);
// Nom avec l'octave en indice (Mi₁ = corde de Mi à vide), en français ou en américain.
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const nameOf = (midi) => noteLabel(NAMES[midi % 12]) + String(Math.floor(midi / 12) - 1).replace(/\d/g, (d) => SUB[d]);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const svg = (tag, attrs) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// Cadran : demi-cercle de -50 à +50 cents (-90° à +90°), zone juste au centre.
const CX = 150, CY = 150, R = 120;
const polar = (cents, r) => {
  const a = ((cents / 50) * 90 - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
function arc(c1, c2, r) {
  const [x1, y1] = polar(c1, r), [x2, y2] = polar(c2, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}
function buildDial() {
  const s = svg('svg', { viewBox: '0 0 300 165', class: 'tuner-dial', 'aria-hidden': 'true' });
  s.append(svg('path', { d: arc(-50, 50, R), class: 'dial-track' }));
  s.append(svg('path', { d: arc(-IN_TUNE, IN_TUNE, R), class: 'dial-zone' }));   // zone « Juste ! »
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 10 === 0;
    const [x1, y1] = polar(c, R - 10), [x2, y2] = polar(c, R - (major ? 24 : 17));
    s.append(svg('line', { x1, y1, x2, y2, class: major ? 'dial-tick major' : 'dial-tick' }));
    if (major && c !== 0) {   // pas de 0 : l'aiguille au repos le cache
      const [tx, ty] = polar(c, R - 38);
      const t = svg('text', { x: tx, y: ty + 4, class: 'dial-label' });
      t.textContent = c > 0 ? `+${c}` : String(c);
      s.append(t);
    }
  }
  const needle = svg('g', { class: 'dial-needle' });
  needle.append(svg('line', { x1: CX, y1: CY, x2: CX, y2: CY - R + 6 }));
  needle.append(svg('circle', { cx: CX, cy: CY, r: 7 }));
  s.append(needle);
  return { node: s, needle };
}

// container : élément où dessiner l'accordeur ; listen(onHear) ouvre l'entrée audio et appelle
// onHear(analyse, seuil) à chaque analyse ; stop() la ferme.
export function createTuner(container, { listen, stop }) {
  container.replaceChildren();

  const head = el('div', 'mixer-head');
  head.append(el('strong', null, 'Accordeur'));
  const modes = el('div', 'tuner-modes');
  modes.setAttribute('role', 'group');
  const modeBtns = { auto: el('button', null, 'Auto'), string: el('button', null, 'Corde par corde') };
  for (const [m, b] of Object.entries(modeBtns)) {
    b.addEventListener('click', () => { settings.mode = m; save(); render(); });
    modes.append(b);
  }
  head.append(modes);

  const dial = buildDial();
  const note = el('div', 'tuner-note', '–');
  const detail = el('div', 'tuner-detail', '');
  const status = el('div', 'tuner-status', 'Joue une corde');

  const strings = el('div', 'tuner-strings');
  const stringBtns = STRINGS.map((m) => {
    const b = el('button', null, nameOf(m));
    b.addEventListener('click', () => { settings.string = m; save(); render(); });
    strings.append(b);
    return [m, b];
  });

  // Diapason de référence (La = 440 Hz), réglable de 430 à 450.
  const refRow = el('div', 'tuner-ref');
  const refText = el('span');
  const refBtn = (delta, label) => {
    const b = el('button', 'small', label);
    b.addEventListener('click', () => {
      settings.ref = Math.min(450, Math.max(430, settings.ref + delta));
      save();
      render();
    });
    return b;
  };
  refRow.append(refBtn(-1, '−'), refText, refBtn(1, '+'));

  container.append(head, dial.node, note, detail, status, strings, refRow);

  function render() {
    for (const [m, b] of Object.entries(modeBtns)) b.classList.toggle('on', settings.mode === m);
    strings.hidden = settings.mode !== 'string';
    for (const [m, b] of stringBtns) {
      b.textContent = nameOf(m);
      b.classList.toggle('on', settings.mode === 'string' && settings.string === m);
    }
    refText.textContent = `La = ${settings.ref} Hz`;
  }
  render();

  // Lissage : médiane des dernières hauteurs (l'aiguille ne tremble pas), affichage gardé un instant après la note.
  const recent = [];
  let lastHeard = 0;
  function onHear({ hz, clarity, rms }, threshold) {
    const now = performance.now();
    if (hz > 0 && clarity >= 0.85 && rms > threshold) {
      recent.push(midiOf(hz));
      if (recent.length > 5) recent.shift();
      lastHeard = now;
    } else if (now - lastHeard > 600) {
      recent.length = 0;
    }
    show(recent.length >= 2 ? [...recent].sort((a, b) => a - b)[recent.length >> 1] : null);
  }

  function show(pitch) {
    container.classList.toggle('idle', pitch == null);
    if (pitch == null) {
      setNeedle(0);
      container.classList.remove('in-tune');
      status.textContent = settings.mode === 'string' ? `Joue la corde de ${nameOf(settings.string)}` : 'Joue une corde';
      return;
    }
    const target = settings.mode === 'string' ? settings.string : Math.round(pitch);
    const cents = Math.round((pitch - target) * 100);
    setNeedle(Math.max(-50, Math.min(50, cents)));
    note.textContent = nameOf(target);
    detail.textContent = `${hzOf(pitch).toFixed(1)} Hz · ${cents > 0 ? '+' : cents < 0 ? '−' : ''}${Math.abs(cents)} c`;
    const inTune = Math.abs(cents) <= IN_TUNE;
    container.classList.toggle('in-tune', inTune);
    if (inTune) status.textContent = 'Juste !';
    else if (Math.abs(cents) >= 50) {
      const semis = Math.round(Math.abs(pitch - target));
      const away = semis >= 1 ? ` de ${semis} demi-ton${semis > 1 ? 's' : ''}` : '';
      status.textContent = cents < 0 ? `Bien trop bas${away} : tends la corde` : `Bien trop haut${away} : détends la corde`;
    } else status.textContent = cents < 0 ? 'Trop bas : tends la corde' : 'Trop haut : détends la corde';
  }

  function setNeedle(cents) {
    dial.needle.style.transform = `rotate(${(cents / 50) * 90}deg)`;
  }

  return {
    async open() {
      recent.length = 0;
      render();
      show(null);
      await listen(onHear);
    },
    close() {
      stop();
    },
  };
}

