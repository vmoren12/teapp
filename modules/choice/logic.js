// @ts-check
// Lògica pura del tauler d'elecció: de 2 a 6 opcions amb pictograma.
// El docent pot marcar l'opció que ha triat el GRUP o deixar el tauler només
// com a referència. No es registra mai qui tria què.

import { cleanText, isObject } from '../../core/schema/validate.js';
import {
  insertItem,
  moveItem,
  patchItem,
  removeItem,
  sanitizeItem,
  sanitizeList,
} from '../shared/items.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../shared/items.js').Item} Option */

/**
 * @typedef {Object} ChoiceState
 * @property {string} title          Pregunta opcional («Què fem ara?»).
 * @property {Option[]} options
 * @property {string | null} chosenId  Opció triada pel grup (null = només referència).
 */

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** @param {unknown} list @returns {Option[]} */
const sanitizeOptions = (list) => sanitizeList(list, (x) => sanitizeItem(x, 40), MAX_OPTIONS);

/** @param {unknown} content @returns {{ title: string, options: Option[] }} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  return { title: cleanText(c.title, 60), options: sanitizeOptions(c.options) };
}

/** @param {unknown} content @returns {ChoiceState} */
export function initialChoice(content) {
  return { ...sanitizeContent(content), chosenId: null };
}

/** @param {unknown} input @returns {ChoiceState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  const base = sanitizeContent(s);
  return { ...base, chosenId: base.options.some((o) => o.id === s.chosenId) ? s.chosenId : null };
}

/** El tauler només es mostra quan té prou opcions. @param {ChoiceState} s */
export const isReady = (s) => s.options.length >= MIN_OPTIONS;

/** @param {ChoiceState} s @param {Option[]} options @returns {ChoiceState} */
const withOptions = (s, options) =>
  options === s.options
    ? s
    : { ...s, options, chosenId: options.some((o) => o.id === s.chosenId) ? s.chosenId : null };

/** @type {Record<string, Reducer>} */
export const choiceActions = {
  setTitle: (/** @type {ChoiceState} */ s, p) => ({ ...s, title: cleanText(p?.title, 60) }),
  add: (/** @type {ChoiceState} */ s, p) =>
    withOptions(s, insertItem(s.options, sanitizeItem(p?.item, 40), MAX_OPTIONS)),
  update: (/** @type {ChoiceState} */ s, p) =>
    withOptions(
      s,
      patchItem(s.options, p?.id, p?.patch, (x) => sanitizeItem(x, 40)),
    ),
  move: (/** @type {ChoiceState} */ s, p) => withOptions(s, moveItem(s.options, p?.id, p?.delta)),
  remove: (/** @type {ChoiceState} */ s, p) => withOptions(s, removeItem(s.options, p?.id)),
  /** Substitueix totes les opcions (un conjunt d'exemple, ja traduït al panell). */
  setOptions: (/** @type {ChoiceState} */ s, p) => ({
    title: cleanText(p?.title ?? s.title, 60),
    options: sanitizeOptions(p?.options),
    chosenId: null,
  }),
  /** Marca (o desmarca, si ja ho estava) l'opció triada pel grup. */
  choose: (/** @type {ChoiceState} */ s, p) => {
    if (p?.id === null) return s.chosenId === null ? s : { ...s, chosenId: null };
    if (!s.options.some((o) => o.id === p?.id)) return s;
    return { ...s, chosenId: s.chosenId === p.id ? null : p.id };
  },
};

/**
 * Conjunts d'exemple: [clau del text, pictograma del paquet inicial].
 * @type {Record<string, [string, string][]>}
 */
export const EXAMPLE_SETS = {
  breaks: [
    ['water', 'beure'],
    ['toilet', 'lavabo'],
    ['rest', 'descansar'],
    ['calmCorner', 'relaxar'],
  ],
  activities: [
    ['read', 'llegir'],
    ['draw', 'plastica'],
    ['computer', 'ordinador'],
    ['play', 'jugar'],
  ],
  materials: [
    ['book', 'llibre'],
    ['computer', 'ordinador'],
    ['write', 'escriure'],
  ],
};
