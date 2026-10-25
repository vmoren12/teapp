// @ts-check
// Emmagatzematge principal amb IndexedDB: un magatzem clau-valor i un altre
// per a imatges (blobs) com els pictogrames.

const DB_NAME = 'teapp';
const DB_VERSION = 1;
const KV = 'kv';
const BLOBS = 'blobs';

/** @param {IDBRequest} request @returns {Promise<any>} */
function done(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @returns {Promise<IDBDatabase>} */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB bloquejada per una altra pestanya'));
    // Alguns navegadors en mode privat no responen mai.
    setTimeout(() => reject(new Error('IndexedDB no respon')), 4000);
  });
}

/** @returns {Promise<import('./adapter.js').StorageAdapter>} */
export async function openIndexedDbStorage() {
  const db = await openDb();

  /** @param {string} store @param {IDBTransactionMode} mode */
  const objectStore = (store, mode) => db.transaction(store, mode).objectStore(store);

  return {
    kind: 'indexeddb',
    get: (key) => done(objectStore(KV, 'readonly').get(key)),
    set: async (key, value) => {
      await done(objectStore(KV, 'readwrite').put(value, key));
    },
    remove: async (key) => {
      await done(objectStore(KV, 'readwrite').delete(key));
    },
    putBlob: async (id, blob) => {
      await done(objectStore(BLOBS, 'readwrite').put(blob, id));
    },
    getBlob: async (id) => (await done(objectStore(BLOBS, 'readonly').get(id))) ?? null,
    removeBlob: async (id) => {
      await done(objectStore(BLOBS, 'readwrite').delete(id));
    },
    clear: async () => {
      await done(objectStore(KV, 'readwrite').clear());
      await done(objectStore(BLOBS, 'readwrite').clear());
    },
  };
}
