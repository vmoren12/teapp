// @ts-check
// Biblioteca de pictogrames. Resol una PictoRef en una URL que es pot posar a
// un <img>, i guarda en local les imatges que el docent fa servir perquè tot
// funcioni sense connexió.
//
// Ordre de resolució:
//   1. Paquet inicial (fitxers inclosos a l'app).
//   2. Imatge desada al dispositiu (ARASAAC descarregat o imatge pròpia).
//   3. ARASAAC a internet (el service worker també la guarda).

import starter from './starter.json';
import { arasaacImageUrl, FETCH_OPTIONS } from './arasaac.js';
import { newId } from '../core/id.js';

/** @typedef {import('../core/types.js').PictoRef} PictoRef */
/** @typedef {{ source: 'arasaac' | 'local', id: string, label: string }} SavedPicto */

/**
 * @typedef {Object} PictoLibrary
 * @property {(ref: PictoRef) => Promise<string | null>} resolve
 * @property {(id: string, label: string) => Promise<void>} saveArasaac
 * @property {(file: Blob, label: string) => Promise<PictoRef>} saveUpload
 * @property {(ref: PictoRef) => Promise<void>} remove
 * @property {() => Promise<SavedPicto[]>} listSaved
 * @property {() => { key: string, id: string }[]} starterItems
 * @property {(key: string) => string | null} starterId
 * @property {(ref: PictoRef) => Promise<string | null>} toDataUrl
 * @property {(id: string, dataUrl: string, label: string) => Promise<boolean>} importDataUrl
 */

const INDEX_KEY = 'pictoIndex';
const MAX_UPLOAD_SIDE = 512;
const SAFE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/** @type {{ key: string, id: string }[]} */
const STARTER = starter.items.map((item) => ({ key: item.key, id: String(item.id) }));
const STARTER_IDS = new Set(STARTER.map((item) => item.id));

/** @param {PictoRef | SavedPicto} ref */
const blobKey = (ref) => `${ref.source}:${ref.id}`;

/**
 * Redueix una imatge pujada perquè ocupi poc.
 * @param {Blob} file
 * @returns {Promise<Blob>}
 */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    return /** @type {Blob | null} */ (blob) ?? file;
  } catch {
    return file;
  }
}

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
 * @param {import('../storage/adapter.js').StorageAdapter} storage
 * @returns {PictoLibrary}
 */
export function createPictoLibrary(storage) {
  /** @type {Map<string, string>} clau → URL (object URL o fitxer) */
  const urls = new Map();

  /** @returns {Promise<SavedPicto[]>} */
  const readIndex = async () => {
    const value = await storage.get(INDEX_KEY).catch(() => undefined);
    return Array.isArray(value) ? value : [];
  };

  /** @param {SavedPicto} entry */
  const addToIndex = async (entry) => {
    const index = await readIndex();
    if (index.some((e) => blobKey(e) === blobKey(entry))) return;
    await storage.set(INDEX_KEY, [entry, ...index]);
  };

  /** @param {PictoRef} ref */
  const fromStorage = async (ref) => {
    const blob = await storage.getBlob(blobKey(ref)).catch(() => null);
    return blob ? URL.createObjectURL(blob) : null;
  };

  return {
    async resolve(ref) {
      const key = blobKey(ref);
      const cached = urls.get(key);
      if (cached) return cached;
      /** @type {string | null} */
      let url;
      if (ref.source === 'arasaac' && STARTER_IDS.has(ref.id)) {
        url = new URL(`starter-pictos/${ref.id}.png`, document.baseURI).href;
      } else {
        url = await fromStorage(ref);
        if (!url && ref.source === 'arasaac') url = arasaacImageUrl(ref.id);
      }
      if (url) urls.set(key, url);
      return url;
    },

    async saveArasaac(id, label) {
      if (STARTER_IDS.has(id)) return;
      /** @type {SavedPicto} */
      const entry = { source: 'arasaac', id, label };
      try {
        const res = await fetch(arasaacImageUrl(id), FETCH_OPTIONS);
        if (!res.ok) return;
        const blob = await res.blob();
        await storage.putBlob(blobKey(entry), blob);
        urls.set(blobKey(entry), URL.createObjectURL(blob));
        await addToIndex(entry);
      } catch {
        // Sense connexió: el service worker en tindrà còpia si ja s'ha vist.
      }
    },

    async saveUpload(file, label) {
      const blob = await shrink(file);
      /** @type {PictoRef} */
      const ref = { source: 'local', id: newId(), alt: label };
      await storage.putBlob(blobKey(ref), blob);
      urls.set(blobKey(ref), URL.createObjectURL(blob));
      await addToIndex({ source: 'local', id: ref.id, label });
      return ref;
    },

    async remove(ref) {
      const key = blobKey(ref);
      await storage.removeBlob(key);
      urls.delete(key);
      const index = await readIndex();
      await storage.set(
        INDEX_KEY,
        index.filter((e) => blobKey(e) !== key),
      );
    },

    listSaved: readIndex,
    starterItems: () => STARTER,
    starterId: (key) => STARTER.find((item) => item.key === key)?.id ?? null,

    async toDataUrl(ref) {
      const blob = await storage.getBlob(blobKey(ref)).catch(() => null);
      return blob ? blobToDataUrl(blob) : null;
    },

    async importDataUrl(id, dataUrl, label) {
      // Només acceptem imatges raster en base64 (mai SVG, que pot contenir codi).
      if (!/^[\w-]{1,64}$/.test(id) || !SAFE_DATA_URL.test(dataUrl)) return false;
      const blob = await (await fetch(dataUrl)).blob();
      await storage.putBlob(`local:${id}`, blob);
      await addToIndex({ source: 'local', id, label });
      return true;
    },
  };
}

/**
 * Cert si l'estat conté algun pictograma d'ARASAAC (per mostrar-ne l'atribució).
 * Recorre l'estat de tots els mòduls, sense necessitat de conèixer-los.
 * @param {unknown} value
 * @returns {boolean}
 */
export function containsArasaac(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsArasaac);
  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.source === 'arasaac' && typeof record.id === 'string') return true;
  return Object.values(record).some(containsArasaac);
}
