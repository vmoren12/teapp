// Service worker de TEApp: fa que l'app funcioni sense connexió.
// La llista de fitxers i la versió les escriu el plugin de Vite en fer la build
// (scripts/vite-plugin-precache.js).
//
// Estratègies:
//   - Fitxers de l'app: primer la memòria cau (són versionats).
//   - Imatges d'ARASAAC: primer la memòria cau; si no hi són, xarxa i es desen.
//   - Cerques a l'API d'ARASAAC: primer la xarxa; sense connexió, la darrera resposta.

const VERSION = '__CACHE_VERSION__';
const SHELL = `teapp-shell-${VERSION}`;
const PICTOS = 'teapp-pictos';
const API = 'teapp-api';
const PRECACHE = self.__PRECACHE_MANIFEST__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('teapp-shell-') && key !== SHELL)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// El panell demana activar la versió nova quan el docent hi està d'acord.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

/** @param {Request} request @param {string} cacheName */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

/** @param {Request} request */
async function networkFirst(request) {
  const cache = await caches.open(API);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'static.arasaac.org') {
    event.respondWith(cacheFirst(request, PICTOS));
    return;
  }
  if (url.hostname === 'api.arasaac.org') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (hit) return hit;
      try {
        return await fetch(request);
      } catch (error) {
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        throw error;
      }
    })(),
  );
});
