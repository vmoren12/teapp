// Service worker de pictapp: fa que l'app funcioni sense connexió.
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
/** @type {[url: string, rev: string][]} Fitxer i empremta del seu contingut. */
const PRECACHE = self.__PRECACHE_MANIFEST__;
// Capçalera on desem l'empremta de cada fitxer a la memòria cau.
const REV_HEADER = 'x-teapp-rev';

/** @param {Response} response @param {string} rev */
function withRev(response, rev) {
  const headers = new Headers(response.headers);
  headers.set(REV_HEADER, rev);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Desa tots els fitxers de la versió nova. Els que no han canviat (mateixa
// empremta, o fitxers de assets/, que ja porten el hash al nom) es copien de la
// memòria cau de la versió anterior: només es baixa el que és nou, i
// l'actualització és molt més ràpida. Si un fitxer no es pot baixar, la
// instal·lació falla sencera (com amb cache.addAll) i es torna a provar més tard.
async function precache() {
  const cache = await caches.open(SHELL);
  const oldNames = (await caches.keys()).filter(
    (key) => key.startsWith('teapp-shell-') && key !== SHELL,
  );
  const oldCaches = await Promise.all(oldNames.map((name) => caches.open(name)));
  await Promise.all(
    PRECACHE.map(async ([url, rev]) => {
      for (const old of oldCaches) {
        const hit = await old.match(url);
        if (hit && (hit.headers.get(REV_HEADER) === rev || url.startsWith('./assets/'))) {
          await cache.put(url, withRev(hit, rev));
          return;
        }
      }
      // no-cache: es revalida amb el servidor, mai una còpia vella de la memòria cau HTTP.
      const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`No s'ha pogut desar ${url} (${response.status})`);
      await cache.put(url, withRev(response, rev));
    }),
  );
}

// Una versió nova s'activa tan bon punt té tots els seus fitxers desats: així la
// memòria cau sempre correspon a la darrera versió publicada. La pàgina oberta
// continua funcionant (ja té el codi carregat) i el panell avisa per recarregar.
self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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
