// Garde l'app en cache pour qu'elle marche hors ligne.
// Réseau d'abord (pour voir tout de suite les modifications), cache en secours.
const CACHE = 'basse-tools-v7';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'theory.js', 'songs.js', 'walking.js', 'midi-import.js', 'tab.js', 'drums.js', 'scales.js', 'random-loop.js',
  'manifest.json', 'vendor/Tone.js', 'vendor/Midi.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })   // toujours revérifier auprès du serveur
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
