// @ts-check
// Lògica pura del tauler Primer → Després.

import { cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';
import { currentActivity, getAgenda, nextActivity } from '../agenda/selectors.js';

/** @typedef {import('../../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {{ label: string, picto: PictoRef | null }} Card */
/**
 * @typedef {Object} FirstThenState
 * @property {Card} first
 * @property {Card} then
 * @property {boolean} firstDone   La primera tasca ja s'ha fet.
 */

/** @returns {Card} */
const emptyCard = () => ({ label: '', picto: null });

/** @param {unknown} input @returns {Card} */
export function sanitizeCard(input) {
  if (!isObject(input)) return emptyCard();
  return { label: cleanText(input.label, 60), picto: sanitizePictoRef(input.picto) };
}

/** @param {unknown} content @returns {{ first: Card, then: Card }} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  return { first: sanitizeCard(c.first), then: sanitizeCard(c.then) };
}

/** @param {unknown} content @returns {FirstThenState} */
export function initialFirstThen(content) {
  return { ...sanitizeContent(content), firstDone: false };
}

/** @param {unknown} input @returns {FirstThenState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  return { ...sanitizeContent(s), firstDone: s.firstDone === true };
}

/** @type {Record<string, Reducer>} */
export const firstThenActions = {
  setCard: (/** @type {FirstThenState} */ s, p) => {
    if (p?.slot !== 'first' && p?.slot !== 'then') return s;
    const slot = /** @type {'first' | 'then'} */ (p.slot);
    return { ...s, [slot]: sanitizeCard({ ...s[slot], ...p.patch }) };
  },
  swap: (/** @type {FirstThenState} */ s) => ({
    ...s,
    first: s.then,
    then: s.first,
    firstDone: false,
  }),
  setDone: (/** @type {FirstThenState} */ s, p) => ({ ...s, firstDone: p?.done === true }),
  /** «Després» passa a ser «Primer» i queda una casella buida per al següent. */
  advance: (/** @type {FirstThenState} */ s) => ({
    first: s.then,
    then: emptyCard(),
    firstDone: false,
  }),
  clear: () => ({ first: emptyCard(), then: emptyCard(), firstDone: false }),
  /** Omple el tauler amb l'activitat actual i la següent de l'agenda. */
  fromAgenda: (/** @type {FirstThenState} */ s, _p, env) => {
    const agenda = getAgenda(env.live);
    if (!agenda) return s;
    const now = currentActivity(agenda);
    const next = nextActivity(agenda);
    if (!now) return s;
    return {
      first: { label: now.label, picto: now.picto },
      then: next ? { label: next.label, picto: next.picto } : emptyCard(),
      firstDone: false,
    };
  },
};
