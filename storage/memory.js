// @ts-check
// Emmagatzematge en memòria: per als tests i com a últim recurs.

/** @returns {import('./adapter.js').StorageAdapter} */
export function createMemoryStorage() {
  /** @type {Map<string, unknown>} */
  const kv = new Map();
  /** @type {Map<string, Blob>} */
  const blobs = new Map();
  return {
    kind: 'memory',
    get: async (key) => structuredClone(kv.get(key)),
    set: async (key, value) => {
      kv.set(key, structuredClone(value));
    },
    remove: async (key) => {
      kv.delete(key);
    },
    putBlob: async (id, blob) => {
      blobs.set(id, blob);
    },
    getBlob: async (id) => blobs.get(id) ?? null,
    removeBlob: async (id) => {
      blobs.delete(id);
    },
    clear: async () => {
      kv.clear();
      blobs.clear();
    },
  };
}
