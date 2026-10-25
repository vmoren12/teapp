// @ts-check
// Capa de persistència abstracta. La resta de l'app només coneix aquesta
// interfície: avui hi ha IndexedDB o localStorage; demà hi podria haver un
// backend amb comptes sense canviar cap mòdul.

import { openIndexedDbStorage } from './indexeddb.js';
import { createLocalStorage } from './local.js';
import { createMemoryStorage } from './memory.js';

/**
 * @typedef {Object} StorageAdapter
 * @property {string} kind                                   'indexeddb' | 'local' | 'memory'
 * @property {(key: string) => Promise<unknown>} get
 * @property {(key: string, value: unknown) => Promise<void>} set
 * @property {(key: string) => Promise<void>} remove
 * @property {(id: string, blob: Blob) => Promise<void>} putBlob
 * @property {(id: string) => Promise<Blob | null>} getBlob
 * @property {(id: string) => Promise<void>} removeBlob
 * @property {() => Promise<void>} clear                      Esborra-ho tot.
 */

/**
 * Tria el millor emmagatzematge disponible al navegador.
 * @returns {Promise<StorageAdapter>}
 */
export async function createStorage() {
  try {
    if (typeof indexedDB !== 'undefined') return await openIndexedDbStorage();
  } catch (error) {
    console.warn('IndexedDB no disponible; es fa servir localStorage.', error);
  }
  try {
    return createLocalStorage(window.localStorage);
  } catch {
    // Navegació privada estricta: les dades només duren mentre la pàgina és oberta.
    return createMemoryStorage();
  }
}
