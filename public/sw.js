// Service worker de TEApp: fa que l'app funcioni sense connexió.
// La llista de fitxers i la versió les escriu el plugin de Vite en fer la build
// (scripts/vite-plugin-precache.js).
//
// Estratègies:
//   - Pàgines (index.html, projection.html): primer la xarxa, perquè en obrir o
//     recarregar l'app es carregui sempre la darrera versió publicada. Sense
//     connexió, la còpia desada d'aquesta versió (mai una pàgina d'una altra
//     versió, que demanaria fitxers que no són a la memòria cau).
//   - Fitxers de l'app: primer la memòria cau (porten el hash al nom).
//   - Imatges d'ARASAAC: primer la memòria cau; si no hi són, xarxa i es desen.
//   - Cerques a l'API d'ARASAAC: primer la xarxa; sense connexió, la darrera resposta.

const VERSION = '__CACHE_VERSION__';
const SHELL = `teapp-shell-${VERSION}`;
const PICTOS = 'teapp-pictos';
const API = 'teapp-api';
const PRECACHE = self.__PRECACHE_MANIFEST__;

// Una versió nova s'activa tan bon punt té tots els seus fitxers desats: així la
// memòria cau sempre correspon a la darrera versió publicada. La pàgina oberta
// continua funcionant (ja té el codi carregat) i el panell avisa per recarregar.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
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

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const key = url.origin + url.pathname;
        try {
          // no-cache: es revalida amb el servidor encara que el navegador en tingui còpia.
          return await fetch(key, { cache: 'no-cache', credentials: 'same-origin' });
        } catch (error) {
          const hit =
            (await cache.match(key)) ?? (await cache.match(request, { ignoreSearch: true }));
          if (hit) return hit;
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
          throw error;
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      // ignoreVary: els fitxers porten el hash al nom; la capçalera Vary (p. ex. Origin en
      // els scripts de mòdul) no ha d'impedir trobar-los sense connexió.
      const hit = await cache.match(request, { ignoreVary: true });
      if (hit) return hit;
      return fetch(request);
    })(),
  );
});
