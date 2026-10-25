// @ts-check
// Lògica pura de les instruccions pas a pas.
//
// Hi ha uns passos generals i, opcionalment, uns de propis per a cada activitat
// de l'agenda. Els que es mostren són els de l'activitat actual (si en té) o els
// generals: quan una activitat comença, les seves instruccions s'hi carreguen
// soles. El pas actual es desa amb la llista a què correspon (`cursor.key`); si
// canvia la llista, es torna a començar pel primer pas.

import { clamp, isObject } from '../../core/schema/validate.js';
import {
  activeKey,
  activityIds,
  GENERAL,
  insertItem,
  isId,
  moveItem,
  patchItem,
  pruneByActivity,
  removeItem,
  sanitizeByActivity,
  sanitizeItem,
  sanitizeList,
} from '../shared/items.js';

/** @typedef {import('../shared/items.js').Item} Step */
/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../../core/types.js').LiveSession} LiveSession */
/** @typedef {import('../../core/types.js').ReducerEnv} ReducerEnv */

/**
 * @typedef {Object} StepsState
 * @property {Step[]} general
 * @property {Record<string, Step[]>} byActivity   id d'activitat → passos propis.
 * @property {{ key: string, index: number }} cursor
 *   Pas actual (index) de la llista `key`. index === llargada vol dir «tots fets».
 */

export const MAX_STEPS = 12;
export const MAX_SETS = 30;

/** @param {unknown} list @returns {Step[]} */
export const sanitizeSteps = (list) => sanitizeList(list, (x) => sanitizeItem(x, 80), MAX_STEPS);

/** @param {unknown} content @returns {{ general: Step[], byActivity: Record<string, Step[]> }} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  return {
    general: sanitizeSteps(c.general),
    byActivity: sanitizeByActivity(c.byActivity, sanitizeSteps, MAX_SETS),
  };
}

/** @param {unknown} content @returns {StepsState} */
export function initialSteps(content) {
  return { ...sanitizeContent(content), cursor: { key: GENERAL, index: 0 } };
}

/** @param {unknown} input @returns {StepsState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  const cursor = isObject(s.cursor) ? s.cursor : {};
  return {
    ...sanitizeContent(s),
    cursor: {
      key: isId(cursor.key) ? cursor.key : GENERAL,
      index: Number.isInteger(cursor.index) ? Math.max(0, cursor.index) : 0,
    },
  };
}

/** @param {StepsState} s @param {string} key @returns {Step[] | null} */
export const listFor = (s, key) => (key === GENERAL ? s.general : (s.byActivity[key] ?? null));

/**
 * Passos que es mostren ara i pas actual.
 * @param {StepsState} s @param {LiveSession} live
 * @returns {{ key: string, steps: Step[], index: number }}
 */
export function activeSteps(s, live) {
  const key = activeKey(s.byActivity, live);
  const steps = listFor(s, key) ?? [];
  const index = s.cursor.key === key ? clamp(s.cursor.index, 0, steps.length) : 0;
  return { key, steps, index };
}

/**
 * Aplica un canvi a una llista i neteja les llistes d'activitats esborrades.
 * @param {StepsState} s @param {unknown} key @param {ReducerEnv} env
 * @param {(steps: Step[]) => Step[]} fn
 * @returns {StepsState}
 */
function editList(s, key, env, fn) {
  if (typeof key !== 'string') return s;
  const list = listFor(s, key);
  if (!list) return s;
  const next = fn(list);
  if (next === list) return s;
  if (key === GENERAL) {
    return { ...s, general: next, byActivity: pruneByActivity(s.byActivity, env.live) };
  }
  return { ...s, byActivity: pruneByActivity({ ...s.byActivity, [key]: next }, env.live) };
}

/** @param {StepsState} s @param {LiveSession} live @param {(index: number, count: number) => number} fn */
function moveCursor(s, live, fn) {
  const { key, steps, index } = activeSteps(s, live);
  const next = clamp(fn(index, steps.length), 0, steps.length);
  if (next === index && s.cursor.key === key) return s;
  return { ...s, cursor: { key, index: next } };
}

/** @type {Record<string, Reducer>} */
export const stepsActions = {
  next: (/** @type {StepsState} */ s, _p, env) => moveCursor(s, env.live, (i) => i + 1),
  prev: (/** @type {StepsState} */ s, _p, env) => moveCursor(s, env.live, (i) => i - 1),
  goTo: (/** @type {StepsState} */ s, p, env) =>
    Number.isInteger(p?.index) ? moveCursor(s, env.live, () => p.index) : s,
  restart: (/** @type {StepsState} */ s, _p, env) => moveCursor(s, env.live, () => 0),
  add: (/** @type {StepsState} */ s, p, env) =>
    editList(s, p?.key, env, (list) => insertItem(list, sanitizeItem(p?.item, 80), MAX_STEPS)),
  update: (/** @type {StepsState} */ s, p, env) =>
    editList(s, p?.key, env, (list) =>
      patchItem(list, p?.id, p?.patch, (x) => sanitizeItem(x, 80)),
    ),
  move: (/** @type {StepsState} */ s, p, env) =>
    editList(s, p?.key, env, (list) => moveItem(list, p?.id, p?.delta)),
  remove: (/** @type {StepsState} */ s, p, env) =>
    editList(s, p?.key, env, (list) => removeItem(list, p?.id)),
  /** Crea passos propis per a una activitat (es comença amb una còpia dels generals). */
  createOwn: (/** @type {StepsState} */ s, p, env) => {
    const key = p?.key;
    if (!isId(key) || key === GENERAL || Object.hasOwn(s.byActivity, key)) return s;
    if (!activityIds(env.live).has(key)) return s;
    return {
      ...s,
      byActivity: pruneByActivity({ ...s.byActivity, [key]: structuredClone(s.general) }, env.live),
    };
  },
  /** L'activitat torna a fer servir els passos generals. */
  removeOwn: (/** @type {StepsState} */ s, p) => {
    if (typeof p?.key !== 'string' || !Object.hasOwn(s.byActivity, p.key)) return s;
    const byActivity = { ...s.byActivity };
    delete byActivity[p.key];
    return { ...s, byActivity };
  },
};
