// @ts-check
// Lògica pura de les expectatives de l'activitat: un tauler fix de quatre
// preguntes (On treballo? Com parlo? Què necessito? Quan acabo?).
// Com les instruccions, hi ha un tauler general i, opcionalment, un de propi
// per a cada activitat de l'agenda, que es mostra sol quan l'activitat comença.

import { cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';
import {
  activeKey,
  activityIds,
  GENERAL,
  isId,
  pruneByActivity,
  sanitizeByActivity,
} from '../shared/items.js';
import { sanitizeVoice } from '../shared/voice.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../../core/types.js').LiveSession} LiveSession */
/** @typedef {{ label: string, picto: PictoRef | null }} Answer */

/**
 * @typedef {Object} Board
 * @property {Answer} where
 * @property {number | null} voice      Escala de veu 0–4 (null = sense indicar).
 * @property {Answer} need
 * @property {Answer & { timer: boolean }} when   `timer`: mostra el temps del temporitzador.
 */

/**
 * @typedef {Object} ExpectationsState
 * @property {Board} general
 * @property {Record<string, Board>} byActivity
 */

export const FIELDS = /** @type {const} */ (['where', 'need', 'when']);
export const MAX_SETS = 30;

/** @param {unknown} input @returns {Answer} */
const sanitizeAnswer = (input) => {
  const a = isObject(input) ? input : {};
  return { label: cleanText(a.label, 60), picto: sanitizePictoRef(a.picto) };
};

/** @returns {Board} */
export const emptyBoard = () => ({
  where: { label: '', picto: null },
  voice: null,
  need: { label: '', picto: null },
  when: { label: '', picto: null, timer: false },
});

/** @param {unknown} input @returns {Board} */
export function sanitizeBoard(input) {
  const b = isObject(input) ? input : {};
  const when = isObject(b.when) ? b.when : {};
  return {
    where: sanitizeAnswer(b.where),
    voice: sanitizeVoice(b.voice),
    need: sanitizeAnswer(b.need),
    when: { ...sanitizeAnswer(when), timer: when.timer === true },
  };
}

/** @param {unknown} content @returns {ExpectationsState} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  return {
    general: sanitizeBoard(c.general),
    byActivity: sanitizeByActivity(c.byActivity, sanitizeBoard, MAX_SETS),
  };
}

/** @param {Board} b */
export const isEmptyBoard = (b) =>
  b.voice === null && FIELDS.every((f) => !b[f].label && !b[f].picto);

/** @param {ExpectationsState} s @param {string} key @returns {Board | null} */
export const boardFor = (s, key) => (key === GENERAL ? s.general : (s.byActivity[key] ?? null));

/** @param {ExpectationsState} s @param {LiveSession} live */
export function activeBoard(s, live) {
  const key = activeKey(s.byActivity, live);
  return { key, board: boardFor(s, key) ?? emptyBoard() };
}

/**
 * @param {ExpectationsState} s @param {unknown} key @param {LiveSession} live
 * @param {(board: Board) => Board} fn
 * @returns {ExpectationsState}
 */
function editBoard(s, key, live, fn) {
  if (typeof key !== 'string') return s;
  const board = boardFor(s, key);
  if (!board) return s;
  const next = sanitizeBoard(fn(board));
  if (JSON.stringify(next) === JSON.stringify(board)) return s;
  if (key === GENERAL)
    return { ...s, general: next, byActivity: pruneByActivity(s.byActivity, live) };
  return { ...s, byActivity: pruneByActivity({ ...s.byActivity, [key]: next }, live) };
}

/**
 * Valors predefinits i reutilitzables. Els textos surten de l'idioma
 * (`expectations.presets.<id>.<camp>`) i els pictogrames, del paquet inicial.
 * @type {{ id: string, where: string, voice: number, need: string, when: string, timer: boolean }[]}
 */
export const PRESETS = [
  {
    id: 'individual',
    where: 'treballar',
    voice: 0,
    need: 'escriure',
    when: 'rellotge',
    timer: true,
  },
  { id: 'pairs', where: 'companys', voice: 1, need: 'llibre', when: 'rellotge', timer: true },
  { id: 'group', where: 'treballGrup', voice: 2, need: 'ordinador', when: 'acabar', timer: false },
  {
    id: 'presentation',
    where: 'escoltar',
    voice: 0,
    need: 'pensar',
    when: 'preguntar',
    timer: false,
  },
];

/** @type {Record<string, Reducer>} */
export const expectationsActions = {
  /** Canvia una resposta (on, què, quan). */
  setAnswer: (/** @type {ExpectationsState} */ s, p, env) => {
    if (!FIELDS.includes(p?.field) || !isObject(p?.patch)) return s;
    const field = /** @type {(typeof FIELDS)[number]} */ (p.field);
    return editBoard(s, p.key, env.live, (b) => ({ ...b, [field]: { ...b[field], ...p.patch } }));
  },
  setVoice: (/** @type {ExpectationsState} */ s, p, env) =>
    editBoard(s, p?.key, env.live, (b) => ({ ...b, voice: sanitizeVoice(p?.level) })),
  /** Aplica un tauler sencer (un valor predefinit, ja traduït al panell). */
  apply: (/** @type {ExpectationsState} */ s, p, env) =>
    editBoard(s, p?.key, env.live, () => sanitizeBoard(p?.board)),
  clear: (/** @type {ExpectationsState} */ s, p, env) =>
    editBoard(s, p?.key, env.live, () => emptyBoard()),
  createOwn: (/** @type {ExpectationsState} */ s, p, env) => {
    const key = p?.key;
    if (!isId(key) || key === GENERAL || Object.hasOwn(s.byActivity, key)) return s;
    if (!activityIds(env.live).has(key)) return s;
    // Es comença amb una còpia del tauler general, que és el que es veia fins ara.
    return {
      ...s,
      byActivity: pruneByActivity({ ...s.byActivity, [key]: structuredClone(s.general) }, env.live),
    };
  },
  removeOwn: (/** @type {ExpectationsState} */ s, p) => {
    if (typeof p?.key !== 'string' || !Object.hasOwn(s.byActivity, p.key)) return s;
    const byActivity = { ...s.byActivity };
    delete byActivity[p.key];
    return { ...s, byActivity };
  },
};
