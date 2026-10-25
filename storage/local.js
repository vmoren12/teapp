// @ts-check
// Emmagatzematge de reserva amb localStorage (si IndexedDB no està disponible).
// Les imatges es desen com a data URL; l'espai és limitat (uns 5 MB).

const PREFIX = 'teapp:';
const BLOB_PREFIX = 'teapp-blob:';

/** @param {Blob} blob @returns {Promise<string>} */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {Storage} ls
 * @returns {import('./adapter.js').StorageAdapter}
 */
export function createLocalStorage(ls) {
  return {
    kind: 'local',
    get: async (key) => {
      const raw = ls.getItem(PREFIX + key);
      return raw == null ? undefined : JSON.parse(raw);
    },
    set: async (key, value) => {
      ls.setItem(PREFIX + key, JSON.stringify(value));
    },
    remove: async (key) => {
      ls.removeItem(PREFIX + key);
    },
    putBlob: async (id, blob) => {
      ls.setItem(BLOB_PREFIX + id, await blobToDataUrl(blob));
    },
    getBlob: async (id) => {
      const url = ls.getItem(BLOB_PREFIX + id);
      return url ? (await fetch(url)).blob() : null;
    },
    removeBlob: async (id) => {
      ls.removeItem(BLOB_PREFIX + id);
    },
    clear: async () => {
      for (const key of Object.keys(ls)) {
        if (key.startsWith(PREFIX) || key.startsWith(BLOB_PREFIX)) ls.removeItem(key);
      }
    },
  };
}
