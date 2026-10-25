// @ts-check
// Peces de lògica pura que comparteixen diversos mòduls: elements amb text i
// pictograma (passos, vinyetes, opcions…), operacions sobre llistes i contingut
// associat a cada activitat de l'agenda.

import { clamp, cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';
import { currentActivity, getAgenda } from '../agenda/selectors.js';

/** @typedef {import('../../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../../core/types.js').LiveSession} LiveSession */

/**
 * Element amb text curt i pictograma (o imatge pròpia).
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} label
 * @property {PictoRef | null} picto
 */

/** Clau de la llista general (la que es fa servir si l'activitat no en té de pròpia). */
export const GENERAL = 'general';

/** @param {unknown} value */
export const isId = (value) => typeof value === 'string' && /^[\w-]{1,64}$/.test(value);

/**
 * @param {unknown} input
 * @param {number} [maxLabel]
 * @returns {Item | null}
 */
export function sanitizeItem(input, maxLabel = 60) {
  if (!isObject(input) || !isId(input.id)) return null;
  return {
    id: input.id,
    label: cleanText(input.label, maxLabel),
    picto: sanitizePictoRef(input.picto),
  };
}

/**
 * Valida una llista d'elements: descarta els invàlids i els repetits.
 * @template T
 * @param {unknown} list
 * @param {(input: unknown) => T | null} sanitize
 * @param {number} max
 * @returns {T[]}
 */
export function sanitizeList(list, sanitize, max) {
  if (!Array.isArray(list)) return [];
  const ids = new Set();
  /** @type {T[]} */
  const out = [];
  for (const raw of list) {
    if (out.length >= max) break;
    const item = sanitize(raw);
    const id = /** @type {any} */ (item)?.id;
    if (item && !ids.has(id)) {
      ids.add(id);
      out.push(item);
    }
  }
  return out;
}

/**
 * @template {{ id: string }} T
 * @param {T[]} list @param {T | null} item @param {number} max @param {number} [at]
 * @returns {T[]}
 */
export function insertItem(list, item, max, at = list.length) {
  if (!item || list.length >= max || list.some((x) => x.id === item.id)) return list;
  const pos = clamp(at, 0, list.length);
  return [...list.slice(0, pos), item, ...list.slice(pos)];
}

/**
 * @template {{ id: string }} T
 * @param {T[]} list @param {unknown} id @param {unknown} patch
 * @param {(input: unknown) => T | null} sanitize
 * @returns {T[]}
 */
export function patchItem(list, id, patch, sanitize) {
  const index = list.findIndex((x) => x.id === id);
  if (index < 0 || !isObject(patch)) return list;
  const merged = sanitize({ ...list[index], ...patch, id });
  if (!merged) return list;
  const out = list.slice();
  out[index] = merged;
  return out;
}

/**
 * @template {{ id: string }} T
 * @param {T[]} list @param {unknown} id @param {unknown} delta
 * @returns {T[]}
 */
export function moveItem(list, id, delta) {
  const from = list.findIndex((x) => x.id === id);
  const to = from + (delta === -1 ? -1 : 1);
  if (from < 0 || to < 0 || to >= list.length) return list;
  const out = list.slice();
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}

/**
 * @template {{ id: string }} T
 * @param {T[]} list @param {unknown} id
 * @returns {T[]}
 */
export function removeItem(list, id) {
  const out = list.filter((x) => x.id !== id);
  return out.length === list.length ? list : out;
}

// --- Contingut per activitat ------------------------------------------------------
// Alguns mòduls (instruccions, expectatives) tenen un contingut general i,
// opcionalment, un de propi per a cada activitat de l'agenda. Quan l'activitat
// comença, es mostra el seu (si en té) sense que el docent hagi de fer res.

/** @param {LiveSession} live */
export function currentActivityId(live) {
  const agenda = getAgenda(live);
  return (agenda && currentActivity(agenda)?.id) ?? null;
}

/** @param {LiveSession} live @returns {Set<string>} */
export function activityIds(live) {
  return new Set((getAgenda(live)?.activities ?? []).map((a) => a.id));
}

/**
 * Clau del contingut que toca mostrar ara: el de l'activitat actual o el general.
 * @param {Record<string, unknown>} byActivity
 * @param {LiveSession} live
 */
export function activeKey(byActivity, live) {
  const id = currentActivityId(live);
  return id && Object.hasOwn(byActivity, id) ? id : GENERAL;
}

/**
 * Treu el contingut d'activitats que ja no són a l'agenda.
 * @template T
 * @param {Record<string, T>} byActivity @param {LiveSession} live
 * @returns {Record<string, T>}
 */
export function pruneByActivity(byActivity, live) {
  const ids = activityIds(live);
  const keys = Object.keys(byActivity);
  if (keys.every((k) => ids.has(k))) return byActivity;
  return Object.fromEntries(keys.filter((k) => ids.has(k)).map((k) => [k, byActivity[k]]));
}

/**
 * @template T
 * @param {unknown} input
 * @param {(value: unknown) => T} sanitize
 * @param {number} max
 * @returns {Record<string, T>}
 */
export function sanitizeByActivity(input, sanitize, max) {
  if (!isObject(input)) return {};
  /** @type {Record<string, T>} */
  const out = {};
  for (const [key, value] of Object.entries(input).slice(0, max)) {
    if (isId(key) && key !== GENERAL) out[key] = sanitize(value);
  }
  return out;
}
