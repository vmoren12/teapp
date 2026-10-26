// @ts-check
// Lògica pura del tauler Primer → Després.

import { cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';
import { currentActivity, getAgenda, nextActivity } from '../agenda/selectors.js';

/** @typedef {import('../../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {{ label: string, picto: PictoRef | null }} Card */
/** @typedef {import('../../core/types.js').LiveSession} LiveSession */
/**
 * @typedef {Object} FirstThenState
 * @property {Card} first
 * @property {Card} then
 * @property {boolean} firstDone   La primera tasca ja s'ha fet.
 * @property {boolean} follow      Segueix l'agenda: les caselles són l'activitat actual i la següent.
 * @property {string | null} doneFor  Seguint l'agenda, activitat a la qual es refereix `firstDone`.
 */
/** @typedef {{ first: Card, then: Card, firstDone: boolean, follow: boolean }} Board */

/** @returns {Card} */
const emptyCard = () => ({ label: '', picto: null });

/** @param {import('../../core/types.js').Activity | null} a @returns {Card} */
const cardOf = (a) => (a ? { label: a.label, picto: a.picto } : emptyCard());

/** @param {Card} c */
const isEmpty = (c) => !c.label && !c.picto;

/** @param {unknown} input @returns {Card} */
export function sanitizeCard(input) {
  if (!isObject(input)) return emptyCard();
  return { label: cleanText(input.label, 60), picto: sanitizePictoRef(input.picto) };
}

/**
 * Per defecte el tauler segueix l'agenda. Les dades d'abans d'aquesta opció que
 * ja tenien caselles omplertes a mà les conserven.
 * @param {unknown} content @returns {{ first: Card, then: Card, follow: boolean }}
 */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  const first = sanitizeCard(c.first);
  const then = sanitizeCard(c.then);
  const follow = typeof c.follow === 'boolean' ? c.follow : isEmpty(first) && isEmpty(then);
  return { first, then, follow };
}

/** @param {unknown} content @returns {FirstThenState} */
export function initialFirstThen(content) {
  return { ...sanitizeContent(content), firstDone: false, doneFor: null };
}

/** @param {unknown} input @returns {FirstThenState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  return {
    ...sanitizeContent(s),
    firstDone: s.firstDone === true,
    doneFor: typeof s.doneFor === 'string' ? s.doneFor : null,
  };
}

/**
 * El que es veu al tauler. Si segueix l'agenda, l'activitat actual i la següent
 * (i «fet» només val per a l'activitat en què es va marcar): així canvia sol
 * quan s'avança d'activitat.
 * @param {FirstThenState} s @param {LiveSession} live @returns {Board}
 */
export function boardOf(s, live) {
  const agenda = s.follow ? getAgenda(live) : null;
  if (!agenda) return { first: s.first, then: s.then, firstDone: s.firstDone, follow: false };
  const now = currentActivity(agenda);
  return {
    first: cardOf(now),
    then: now ? cardOf(nextActivity(agenda)) : emptyCard(),
    firstDone: s.firstDone && now !== null && s.doneFor === now.id,
    follow: true,
  };
}

/**
 * Deixa de seguir l'agenda i es queda amb el que es veu ara (per editar-ho a mà).
 * @param {FirstThenState} s @param {LiveSession} live @returns {FirstThenState}
 */
const detach = (s, live) => {
  const b = boardOf(s, live);
  return { first: b.first, then: b.then, firstDone: b.firstDone, follow: false, doneFor: null };
};

/** @type {Record<string, Reducer>} */
export const firstThenActions = {
  setCard: (/** @type {FirstThenState} */ s, p, env) => {
    if (p?.slot !== 'first' && p?.slot !== 'then') return s;
    const slot = /** @type {'first' | 'then'} */ (p.slot);
    const base = detach(s, env.live);
    return { ...base, [slot]: sanitizeCard({ ...base[slot], ...p.patch }) };
  },
  swap: (/** @type {FirstThenState} */ s, _p, env) => {
    const base = detach(s, env.live);
    return { ...base, first: base.then, then: base.first, firstDone: false };
  },
  setDone: (/** @type {FirstThenState} */ s, p, env) => {
    const agenda = s.follow ? getAgenda(env.live) : null;
    const now = agenda ? currentActivity(agenda) : null;
    return { ...s, firstDone: p?.done === true, doneFor: now ? now.id : null };
  },
  /** «Després» passa a ser «Primer» i queda una casella buida per al següent. */
  advance: (/** @type {FirstThenState} */ s, _p, env) => {
    const base = detach(s, env.live);
    return { ...base, first: base.then, then: emptyCard(), firstDone: false };
  },
  clear: () => ({
    first: emptyCard(),
    then: emptyCard(),
    firstDone: false,
    follow: false,
    doneFor: null,
  }),
  /** Torna a seguir l'agenda (o en deixa de seguir, amb `follow: false`). */
  setFollow: (/** @type {FirstThenState} */ s, p, env) =>
    p?.follow === false
      ? detach(s, env.live)
      : { ...s, follow: true, firstDone: false, doneFor: null },
};
