// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Bibliothèque des fichiers MIDI importés, gardés dans le navigateur (IndexedDB, sur l'appareil :
// rien n'est envoyé). Chaque morceau garde le fichier d'origine et la piste basse choisie.

const DB = 'bassroutine-library';
const STORE = 'midi';

let dbPromise = null;
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Lance fn(store) dans une transaction et renvoie le résultat de la requête qu'elle rend.
async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const librarySupported = () => typeof indexedDB !== 'undefined';

// Liste des morceaux { id, title, name, added } (sans le contenu), du plus récent au plus ancien.
export async function listSongs() {
  const all = await run('readonly', (s) => s.getAll());
  return all.map(({ id, title, name, added }) => ({ id, title, name, added })).sort((a, b) => b.added - a.added);
}

// Ajoute un fichier (title : titre lu dans le fichier). Le même fichier (nom et taille) remplace l'ancien.
export async function addSong(file, title, track) {
  const data = await file.arrayBuffer();
  const same = (await run('readonly', (s) => s.getAll())).find((x) => x.name === file.name && x.data.byteLength === data.byteLength);
  const entry = { title, name: file.name, data, track, added: Date.now() };
  if (same) entry.id = same.id;
  return run('readwrite', (s) => s.put(entry));
}

// Fichier d'un morceau (un File, comme à l'import) et sa piste basse, ou null s'il n'existe plus.
export async function getSong(id) {
  const x = await run('readonly', (s) => s.get(id));
  return x ? { file: new File([x.data], x.name), track: x.track } : null;
}

export async function setSongTrack(id, track) {
  const x = await run('readonly', (s) => s.get(id));
  if (x) await run('readwrite', (s) => s.put({ ...x, track }));
}

export const removeSong = (id) => run('readwrite', (s) => s.delete(id));
