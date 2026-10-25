// @ts-check
// Lògica pura dels torns previsibles.
//
// Els participants poden ser noms (o àlies, o noms de grup), números o colors.
// L'ordre és fix i visible. En mode aleatori, l'ordre barrejat es mostra sencer
// ABANS de començar: mai no hi ha sorpreses.
//
// Privacitat: els noms només es desen en local i no s'exporten si el docent no
// ho marca (vegeu exportContent a index.js). La projecció no mostra mai
// comptadors, puntuacions ni cap comparació entre alumnes.

import { clamp, cleanText, isObject } from '../../core/schema/validate.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */

/**
 * @typedef {Object} TurnsState
 * @property {'names' | 'numbers' | 'colors'} kind
 * @property {string[]} names     Noms, àlies o noms de grup (kind 'names').
 * @property {number} count       Quants participants (kind 'numbers' o 'colors').
 * @property {number[]} order     Ordre dels torns: índexs de participants.
 * @property {number} position    Torn actual (posició dins de `order`).
 * @property {'list' | 'random'} mode
 */

export const KINDS = /** @type {const} */ (['names', 'numbers', 'colors']);
export const COLORS = /** @type {const} */ ([
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'grey',
  'brown',
]);
export const MAX_NAMES = 40;
export const MAX_NAME = 30;
export const MIN_COUNT = 2;
export const MAX_COUNT = 40;

/** @returns {TurnsState} */
export const initialTurns = () => ({
  kind: 'numbers',
  names: [],
  count: 4,
  order: [0, 1, 2, 3],
  position: 0,
  mode: 'list',
});

/** @param {unknown} list @returns {string[]} */
export function sanitizeNames(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((n) => cleanText(n, MAX_NAME).trim())
    .filter(Boolean)
    .slice(0, MAX_NAMES);
}

/** Nombre de participants. @param {Pick<TurnsState, 'kind' | 'names' | 'count'>} s */
export function participantCount(s) {
  if (s.kind === 'names') return s.names.length;
  if (s.kind === 'colors') return Math.min(s.count, COLORS.length);
  return s.count;
}

/** @param {number} n */
const identity = (n) => Array.from({ length: n }, (_, i) => i);

/** Cert si `order` és una permutació de 0…n-1. @param {unknown} order @param {number} n */
export function isPermutation(order, n) {
  if (!Array.isArray(order) || order.length !== n) return false;
  const seen = new Set(order);
  return seen.size === n && order.every((i) => Number.isInteger(i) && i >= 0 && i < n);
}

/**
 * Torna a fer l'ordre quan canvien els participants: conserva el dels que hi
 * continuen i afegeix els nous al final.
 * @param {number[]} order @param {number} n
 */
function reconcile(order, n) {
  const kept = order.filter((i) => i < n);
  const missing = identity(n).filter((i) => !kept.includes(i));
  return [...kept, ...missing];
}

/** @param {unknown} content @returns {Pick<TurnsState, 'kind' | 'names' | 'count'>} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  const d = initialTurns();
  return {
    kind: KINDS.includes(c.kind) ? c.kind : d.kind,
    names: sanitizeNames(c.names),
    count: Number.isInteger(c.count) ? clamp(c.count, MIN_COUNT, MAX_COUNT) : d.count,
  };
}

/** @param {unknown} content @returns {TurnsState} */
export function initialFromContent(content) {
  const base = sanitizeContent(content);
  return { ...base, order: identity(participantCount(base)), position: 0, mode: 'list' };
}

/** @param {unknown} input @returns {TurnsState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  const base = sanitizeContent(s);
  const n = participantCount(base);
  const order = isPermutation(s.order, n) ? /** @type {number[]} */ (s.order) : identity(n);
  return {
    ...base,
    order,
    position: Number.isInteger(s.position) ? clamp(s.position, 0, Math.max(0, n - 1)) : 0,
    mode: s.mode === 'random' ? 'random' : 'list',
  };
}

/**
 * Canvia els participants mantenint l'ordre que es pugui.
 * @param {TurnsState} s @param {Partial<Pick<TurnsState, 'kind' | 'names' | 'count'>>} patch
 * @returns {TurnsState}
 */
function withParticipants(s, patch) {
  const base = sanitizeContent({ kind: s.kind, names: s.names, count: s.count, ...patch });
  const n = participantCount(base);
  const kindChanged = base.kind !== s.kind;
  const order = kindChanged ? identity(n) : reconcile(s.order, n);
  return {
    ...base,
    order,
    position: clamp(s.position, 0, Math.max(0, n - 1)),
    mode: kindChanged ? 'list' : s.mode,
  };
}

/** Qui té el torn ara i qui després (índexs de participant). @param {TurnsState} s */
export function nowAndNext(s) {
  const n = s.order.length;
  if (n === 0) return { now: null, next: null };
  return { now: s.order[s.position] ?? null, next: n > 1 ? s.order[(s.position + 1) % n] : null };
}

/** @type {Record<string, Reducer>} */
export const turnsActions = {
  setKind: (/** @type {TurnsState} */ s, p) =>
    KINDS.includes(p?.kind) && p.kind !== s.kind ? withParticipants(s, { kind: p.kind }) : s,
  setNames: (/** @type {TurnsState} */ s, p) => withParticipants(s, { names: p?.names }),
  setCount: (/** @type {TurnsState} */ s, p) =>
    Number.isInteger(p?.count) ? withParticipants(s, { count: p.count }) : s,
  /** L'ordre és circular: després de l'últim torna a començar. */
  next: (/** @type {TurnsState} */ s) =>
    s.order.length < 2 ? s : { ...s, position: (s.position + 1) % s.order.length },
  prev: (/** @type {TurnsState} */ s) =>
    s.order.length < 2 ? s : { ...s, position: (s.position - 1 + s.order.length) % s.order.length },
  goTo: (/** @type {TurnsState} */ s, p) =>
    Number.isInteger(p?.position) && p.position >= 0 && p.position < s.order.length
      ? { ...s, position: p.position }
      : s,
  /**
   * Ordre aleatori ANUNCIAT: la permutació la fa el panell (els reductors són
   * purs) i es mostra sencera a la pantalla abans del primer torn.
   */
  shuffle: (/** @type {TurnsState} */ s, p) =>
    isPermutation(p?.order, s.order.length)
      ? { ...s, order: [...p.order], position: 0, mode: 'random' }
      : s,
  listOrder: (/** @type {TurnsState} */ s) => ({
    ...s,
    order: identity(s.order.length),
    position: 0,
    mode: 'list',
  }),
};

/**
 * Permutació aleatòria (Fisher–Yates).
 * @param {number} n @param {() => number} [random]
 */
export function randomOrder(n, random = Math.random) {
  const order = identity(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
