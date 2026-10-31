// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Objectifs et trophées : le temps passé en lecture (Play) est compté jour par jour. À l'arrêt de la
// musique, un bilan dit ce qu'il reste à jouer pour l'objectif du jour, ou félicite (confettis !).
// Tout reste dans le navigateur (localStorage) : pas de compte, rien n'est envoyé.

const SETTINGS_KEY = 'bassroutine-goals';
const LOG_KEY = 'bassroutine-practice';
const MIN_SESSION = 20;   // en dessous (secondes), pas de bilan : un Play pour essayer un réglage

export const DAILY_CHOICES = { 5: '5 min', 10: '10 min', 15: '15 min', 20: '20 min', 30: '30 min', 45: '45 min', 60: '1 h', 90: '1 h 30', 120: '2 h' };
export const WEEKLY_CHOICES = { 0: 'Aucun', 60: '1 h', 120: '2 h', 180: '3 h', 300: '5 h', 420: '7 h', 600: '10 h' };

// Trophées : test sur l'état après la séance (st), dans l'ordre d'affichage.
const TROPHIES = [
  { id: 'first', icon: '🎸', label: 'Première séance', test: (st) => st.total >= 60 },
  { id: 'goal', icon: '🎯', label: 'Premier objectif du jour', test: (st) => st.met.length >= 1 },
  { id: 'long', icon: '💪', label: 'Séance de 30 min d\'affilée', test: (st) => st.session >= 1800 },
  { id: 'streak3', icon: '🔥', label: '3 jours d\'affilée', test: (st) => st.streak >= 3 },
  { id: 'streak7', icon: '🔥', label: '7 jours d\'affilée', test: (st) => st.streak >= 7 },
  { id: 'streak30', icon: '🌟', label: '30 jours d\'affilée', test: (st) => st.streak >= 30 },
  { id: 'week', icon: '📅', label: 'Objectif de la semaine', test: (st) => st.weekGoal > 0 && st.week >= st.weekGoal },
  { id: 'h1', icon: '⏱', label: '1 heure de basse', test: (st) => st.total >= 3600 },
  { id: 'h10', icon: '🥉', label: '10 heures de basse', test: (st) => st.total >= 36000 },
  { id: 'h50', icon: '🥈', label: '50 heures de basse', test: (st) => st.total >= 180000 },
  { id: 'h100', icon: '🥇', label: '100 heures de basse', test: (st) => st.total >= 360000 },
];

const load = (key, fallback) => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; } catch { return { ...fallback }; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
};

let settings = load(SETTINGS_KEY, { on: false, daily: 15, weekly: 0 });
let log = load(LOG_KEY, { days: {}, met: [], trophies: {} });

export const goalSettings = () => settings;
export function setGoals(change) {
  settings = { ...settings, ...change };
  save(SETTINGS_KEY, settings);
}

// Jour local au format AAAA-MM-JJ (minuit chez soi, pas en UTC).
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Durées : « 45 s », « 7 min », « 1 h 05 ».
export function formatDuration(sec) {
  const min = Math.floor(sec / 60);
  if (min < 1) return `${Math.round(sec)} s`;
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

function state(now = new Date(), session = 0) {
  const today = log.days[dayKey(now)] ?? 0;
  let week = 0;
  const monday = shift(now, -((now.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) week += log.days[dayKey(shift(monday, i))] ?? 0;
  // Série : jours d'affilée où l'objectif a été atteint, jusqu'à aujourd'hui (ou hier si pas encore aujourd'hui).
  const met = new Set(log.met);
  let d = met.has(dayKey(now)) ? now : shift(now, -1), streak = 0;
  while (met.has(dayKey(d))) { streak++; d = shift(d, -1); }
  const total = Object.values(log.days).reduce((a, b) => a + b, 0);
  return { today, week, streak, total, session, met: log.met, dayGoal: settings.daily * 60, weekGoal: settings.weekly * 60 };
}

// Ajoute une séance de lecture (en secondes) et renvoie le bilan : objectif franchi, trophées gagnés.
export function addPractice(seconds, now = new Date()) {
  seconds = Math.min(seconds, 4 * 3600);   // garde-fou : un appareil endormi pendant la lecture
  if (!(seconds > 0)) return null;
  const key = dayKey(now);
  const before = state(now);
  log.days[key] = (log.days[key] ?? 0) + seconds;
  const dayGoal = settings.daily * 60;
  const reached = before.today < dayGoal && before.today + seconds >= dayGoal;
  if (reached && !log.met.includes(key)) log.met.push(key);
  const after = state(now, seconds);
  const weekReached = after.weekGoal > 0 && before.week < after.weekGoal && after.week >= after.weekGoal;
  const won = [];
  for (const t of TROPHIES) {
    if (log.trophies[t.id] || !t.test(after)) continue;
    log.trophies[t.id] = key;
    won.push(t);
  }
  save(LOG_KEY, log);
  return { ...after, reached, weekReached, won };
}

export function resetPractice() {
  log = { days: {}, met: [], trophies: {} };
  save(LOG_KEY, log);
}

// ---------- Affichage ----------
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

function progress(label, value, goal) {
  const box = el('div', 'goal-progress');
  const head = el('div', 'goal-progress-head');
  head.append(el('span', null, label), el('span', null, `${formatDuration(value)} / ${formatDuration(goal)}${value >= goal ? ' ✓' : ''}`));
  const bar = el('div', 'goal-bar');
  const fill = el('div', value >= goal ? 'done' : null);
  fill.style.width = `${Math.min(100, (value / goal) * 100)}%`;
  bar.append(fill);
  box.append(head, bar);
  return box;
}

// Bilan dans l'onglet 🏆 des réglages : aujourd'hui, la semaine, la série, les trophées.
export function renderGoalStats(panel) {
  panel.replaceChildren();
  const st = state();
  panel.append(progress('Aujourd\'hui', st.today, st.dayGoal));
  if (st.weekGoal) panel.append(progress('Cette semaine', st.week, st.weekGoal));
  else panel.append(el('p', 'midi-note', `Cette semaine : ${formatDuration(st.week)}`));
  panel.append(el('p', 'midi-note', `🔥 Série : ${st.streak} jour${st.streak > 1 ? 's' : ''} d'affilée · Au total : ${formatDuration(st.total)}`));
  const grid = el('ul', 'trophy-grid');
  for (const t of TROPHIES) {
    const on = log.trophies[t.id];
    const li = el('li', on ? 'won' : null);
    li.title = on ? `Gagné le ${on.split('-').reverse().join('/')}` : 'À gagner';
    li.append(el('span', 'trophy-icon', on ? t.icon : '🔒'), el('span', null, t.label));
    grid.append(li);
  }
  panel.append(grid);
}

// Pluie de confettis sur tout l'écran (canvas posé au-dessus de tout, ne capte pas les touches).
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('.confetti-canvas')?.remove();
  const canvas = el('canvas', 'confetti-canvas');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = innerWidth, h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#f2c14e', '#e5534b', '#3fb950', '#58a6ff', '#bc8cff', '#ff8fd0', '#ffffff'];
  // Deux canons en bas à gauche et à droite, plus une pluie depuis le haut.
  const bits = Array.from({ length: 220 }, (_, i) => {
    const side = i % 3, fromTop = side === 2;
    const angle = fromTop ? Math.PI / 2 : (side === 0 ? -1 : -Math.PI + 1) + (Math.random() - 0.5) * 0.7;
    const speed = fromTop ? 1 + Math.random() * 2 : 9 + Math.random() * 9;
    return {
      x: fromTop ? Math.random() * w : side === 0 ? 0 : w,
      y: fromTop ? -20 - Math.random() * h * 0.6 : h * 0.85,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 7, color: colors[i % colors.length],
      spin: Math.random() * Math.PI, vspin: (Math.random() - 0.5) * 0.3, wobble: Math.random() * 10,
    };
  });
  const t0 = performance.now(), life = 4200;
  const tick = (t) => {
    const age = t - t0;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, (life - age) / 800));
    for (const b of bits) {
      b.vy += 0.22;
      b.vx *= 0.985;
      b.vy = Math.min(b.vy, 4.5);   // les confettis planent en tombant
      b.x += b.vx + Math.sin((age / 300) + b.wobble) * 0.6;
      b.y += b.vy;
      b.spin += b.vspin;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      ctx.scale(1, Math.cos(age / 120 + b.wobble));   // la feuille tourne sur elle-même
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      ctx.restore();
    }
    if (age < life) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

// Bilan à l'arrêt de la musique : la popup (et les confettis) seulement pour fêter un objectif ou
// un trophée ; sinon un simple message (say) qui s'efface seul, pour ne pas interrompre à chaque Stop.
export function showSessionResult(r, say) {
  if (!r || r.session < MIN_SESSION) return;
  const left = r.dayGoal - r.today;
  if (!r.reached && !r.weekReached && !r.won.length) {
    const week = r.weekGoal ? ` · Semaine : ${formatDuration(r.week)} / ${formatDuration(r.weekGoal)}` : '';
    say(left > 0
      ? `⏳ Encore ${Math.ceil(left / 60)} min pour l'objectif du jour (${formatDuration(r.today)} / ${formatDuration(r.dayGoal)})${week}`
      : `✅ Aujourd'hui : ${formatDuration(r.today)}, objectif atteint${week}`);
    return;
  }
  document.querySelector('.goal-result')?.remove();
  const party = r.reached || r.weekReached || r.won.length > 0;
  const root = el('div', 'game-result goal-result');
  root.setAttribute('role', 'dialog');
  const card = el('div', 'game-card');
  let emoji, title, text;
  if (r.reached) {
    [emoji, title] = ['🏆', 'Objectif du jour atteint !'];
    text = `${formatDuration(r.today)} de basse aujourd'hui. Bravo !`;
  } else if (r.weekReached) {
    [emoji, title] = ['🏆', 'Objectif de la semaine atteint !'];
    text = `${formatDuration(r.week)} de basse cette semaine. Chapeau !`;
  } else if (left > 0) {
    [emoji, title] = ['🏅', 'Nouveau trophée !'];
    text = `Encore ${Math.ceil(left / 60)} min pour ton objectif du jour. Allez, on relance ?`;
  } else {
    [emoji, title, text] = ['🏅', 'Nouveau trophée !', `${formatDuration(r.today)} de basse aujourd'hui.`];
  }
  root.setAttribute('aria-label', title);
  const main = el('div', 'game-main');
  main.append(el('div', 'game-emoji', emoji), el('p', 'goal-title', title), el('p', 'game-text', text));
  const side = el('div', 'game-side');
  side.append(el('p', 'game-tip', `Cette séance : ${formatDuration(r.session)}`), progress('Aujourd\'hui', r.today, r.dayGoal));
  if (r.weekGoal) side.append(progress('Cette semaine', r.week, r.weekGoal));
  if (r.streak > 1) side.append(el('p', 'game-tip', `🔥 ${r.streak} jours d'affilée`));
  if (r.won.length) {
    const list = el('ul', 'game-details');
    for (const t of r.won) list.append(el('li', null, `${t.icon} Trophée : ${t.label}`));
    side.append(list);
  }
  const actions = el('div', 'game-actions');
  const ok = el('button', 'primary', party ? 'Merci !' : 'OK');
  const dismiss = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  ok.addEventListener('click', dismiss);
  root.addEventListener('click', (e) => { if (e.target === root) dismiss(); });
  document.addEventListener('keydown', onKey);
  actions.append(ok);
  side.append(actions);
  card.append(main, side);
  root.append(card);
  document.body.append(root);
  ok.focus({ preventScroll: true });
  if (party) confetti();
}
