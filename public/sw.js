/*
 * Service worker ROHAFYA : rend l'application installable et affiche une page « hors connexion ».
 * Aucune donnée médicale ni réponse de l'API n'est mise en cache : seules la page hors connexion
 * et ses images le sont. Toutes les autres requêtes passent par le réseau, sans copie locale.
 */
const CACHE = 'rohafya-offline-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS = [OFFLINE_URL, '/rohafya-emblem.png', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Navigation (ouverture d'une page) : réseau d'abord, page hors connexion en cas d'échec.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Images de la page hors connexion uniquement ; tout le reste : réseau, sans cache.
  const url = new URL(request.url);
  if (request.method === 'GET' && url.origin === self.location.origin && ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
  }
});
