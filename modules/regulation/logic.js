// @ts-check
// Lògica pura de les eines de regulació: termòmetre emocional i respiració guiada.
//
// Termòmetre: escala de 3 a 5 nivells amb color i estratègies associades. És
// una referència per a tot el grup: no es registra mai cap estat individual
// (no hi ha cap acció per «marcar com està» ningú).
//
// Respiració: el ritme es calcula a partir de `startedAt`, com el temporitzador,
// de manera que totes les finestres van sincronitzades.

import { cleanText, isObject } from '../../core/schema/validate.js';
import {
  insertItem,
  isId,
  moveItem,
  patchItem,
  removeItem,
  sanitizeItem,
  sanitizeList,
} from '../shared/items.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../shared/items.js').Item} Strategy */

/**
 * @typedef {Object} Level
 * @property {string} id
 * @property {string} label
 * @property {LevelColor} color
 * @property {Strategy[]} strategies
 */

/** @typedef {(typeof LEVEL_COLORS)[number]} LevelColor */

/**
 * @typedef {Object} RegulationState
 * @property {'thermometer' | 'breathing'} tool
 * @property {Level[]} levels         De més calma (0) a més intensitat.
 * @property {number | null} breathingSince  Quan ha començat la respiració (null = aturada).
 */

export const LEVEL_COLORS = /** @type {const} */ (['blue', 'green', 'yellow', 'orange', 'rose']);
export const MIN_LEVELS = 3;
export const MAX_LEVELS = 5;
export const MAX_STRATEGIES = 3;
export const TOOLS = /** @type {const} */ (['thermometer', 'breathing']);

/** @param {unknown} input @returns {Level | null} */
export function sanitizeLevel(input) {
  if (!isObject(input) || !isId(input.id)) return null;
  return {
    id: input.id,
    label: cleanText(input.label, 40),
    color: LEVEL_COLORS.includes(input.color) ? input.color : 'green',
    strategies: sanitizeList(input.strategies, (x) => sanitizeItem(x, 40), MAX_STRATEGIES),
  };
}

/** @param {unknown} list @returns {Level[]} */
export function sanitizeLevels(list) {
  const levels = sanitizeList(list, sanitizeLevel, MAX_LEVELS);
  // Un termòmetre de menys de 3 nivells no té sentit: es considera sense configurar.
  return levels.length >= MIN_LEVELS ? levels : [];
}

/** @param {unknown} content @returns {{ levels: Level[] }} */
export function sanitizeContent(content) {
  return { levels: sanitizeLevels(isObject(content) ? content.levels : []) };
}

/** @param {unknown} content @returns {RegulationState} */
export function initialRegulation(content) {
  return { tool: 'thermometer', ...sanitizeContent(content), breathingSince: null };
}

/** @param {unknown} input @returns {RegulationState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  return {
    tool: TOOLS.includes(s.tool) ? s.tool : 'thermometer',
    ...sanitizeContent(s),
    breathingSince: typeof s.breathingSince === 'number' ? s.breathingSince : null,
  };
}

/**
 * @param {RegulationState} s @param {(levels: Level[]) => Level[]} fn
 * @returns {RegulationState}
 */
function editLevels(s, fn) {
  const levels = fn(s.levels);
  return levels === s.levels ? s : { ...s, levels };
}

/**
 * @param {RegulationState} s @param {unknown} levelId
 * @param {(strategies: Strategy[]) => Strategy[]} fn
 */
function editStrategies(s, levelId, fn) {
  return editLevels(s, (levels) => {
    const index = levels.findIndex((l) => l.id === levelId);
    if (index < 0) return levels;
    const strategies = fn(levels[index].strategies);
    if (strategies === levels[index].strategies) return levels;
    const out = levels.slice();
    out[index] = { ...levels[index], strategies };
    return out;
  });
}

// --- Respiració guiada --------------------------------------------------------------

/** @typedef {'in' | 'hold' | 'out' | 'rest'} BreathPhase */

/** Ritmes (segons de cada fase). «4-6» vol dir inspirar 4 s i expirar 6 s. */
/** @type {Record<string, [BreathPhase, number][]>} */
export const PATTERNS = {
  '4-4-4': [
    ['in', 4],
    ['hold', 4],
    ['out', 4],
  ],
  '4-6': [
    ['in', 4],
    ['out', 6],
  ],
  '4-7-8': [
    ['in', 4],
    ['hold', 7],
    ['out', 8],
  ],
  '5-5': [
    ['in', 5],
    ['out', 5],
  ],
};

/**
 * Fase de la respiració en un moment donat.
 * @param {string} pattern @param {number} elapsedMs
 * @returns {{ phase: BreathPhase, index: number, second: number, seconds: number, cycleMs: number, cycle: number }}
 *   `second`: segon dins de la fase (1, 2, 3…); `cycle`: quantes respiracions s'han fet.
 */
export function breathingPhase(pattern, elapsedMs) {
  const phases = PATTERNS[pattern] ?? PATTERNS['4-6'];
  const cycleMs = phases.reduce((sum, [, s]) => sum + s * 1000, 0);
  const elapsed = Math.max(0, elapsedMs);
  let t = elapsed % cycleMs;
  for (let i = 0; i < phases.length; i++) {
    const [phase, seconds] = phases[i];
    if (t < seconds * 1000) {
      return {
        phase,
        index: i,
        second: Math.floor(t / 1000) + 1,
        seconds,
        cycleMs,
        cycle: Math.floor(elapsed / cycleMs),
      };
    }
    t -= seconds * 1000;
  }
  const [phase, seconds] = phases[phases.length - 1];
  return { phase, index: phases.length - 1, second: seconds, seconds, cycleMs, cycle: 0 };
}

/** @type {Record<string, Reducer>} */
export const regulationActions = {
  setTool: (/** @type {RegulationState} */ s, p) =>
    TOOLS.includes(p?.tool) && p.tool !== s.tool ? { ...s, tool: p.tool } : s,
  /** Substitueix tots els nivells (p. ex. amb el termòmetre d'exemple, ja traduït). */
  setLevels: (/** @type {RegulationState} */ s, p) => {
    const levels = sanitizeLevels(p?.levels);
    return levels.length ? { ...s, levels } : s;
  },
  addLevel: (/** @type {RegulationState} */ s, p) =>
    editLevels(s, (levels) => insertItem(levels, sanitizeLevel(p?.level), MAX_LEVELS)),
  /** Canvia el nom o el color d'un nivell (les estratègies tenen les seves accions). */
  updateLevel: (/** @type {RegulationState} */ s, p) =>
    editLevels(s, (levels) => {
      if (!isObject(p?.patch)) return levels;
      /** @type {Record<string, unknown>} */
      const patch = {};
      if (p.patch.label !== undefined) patch.label = p.patch.label;
      if (p.patch.color !== undefined) patch.color = p.patch.color;
      return patchItem(levels, p.id, patch, (x) => sanitizeLevel(x));
    }),
  moveLevel: (/** @type {RegulationState} */ s, p) =>
    editLevels(s, (levels) => moveItem(levels, p?.id, p?.delta)),
  removeLevel: (/** @type {RegulationState} */ s, p) =>
    s.levels.length <= MIN_LEVELS ? s : editLevels(s, (levels) => removeItem(levels, p?.id)),
  addStrategy: (/** @type {RegulationState} */ s, p) =>
    editStrategies(s, p?.levelId, (list) =>
      insertItem(list, sanitizeItem(p?.item, 40), MAX_STRATEGIES),
    ),
  updateStrategy: (/** @type {RegulationState} */ s, p) =>
    editStrategies(s, p?.levelId, (list) =>
      patchItem(list, p?.id, p?.patch, (x) => sanitizeItem(x, 40)),
    ),
  moveStrategy: (/** @type {RegulationState} */ s, p) =>
    editStrategies(s, p?.levelId, (list) => moveItem(list, p?.id, p?.delta)),
  removeStrategy: (/** @type {RegulationState} */ s, p) =>
    editStrategies(s, p?.levelId, (list) => removeItem(list, p?.id)),
  /** Comença la respiració guiada (també des de la pantalla de calma). */
  startBreathing: (/** @type {RegulationState} */ s, _p, env) => ({
    ...s,
    tool: 'breathing',
    breathingSince: env.now,
  }),
  stopBreathing: (/** @type {RegulationState} */ s) =>
    s.breathingSince === null ? s : { ...s, breathingSince: null },
};

/**
 * Termòmetres d'exemple. Textos a l'idioma (`regulation.examples.l<n>.…`),
 * [color, clau del nivell, estratègies (clau de text, pictograma)].
 * @type {Record<'three' | 'five', [LevelColor, string, [string, string][]][]>}
 */
export const EXAMPLE_LEVELS = {
  five: [
    ['blue', 'calm', [['keepGoing', 'treballar']]],
    ['green', 'fine', [['keepGoing', 'treballar']]],
    [
      'yellow',
      'restless',
      [
        ['breathe', 'respirar'],
        ['water', 'beure'],
      ],
    ],
    [
      'orange',
      'nervous',
      [
        ['pause', 'descansar'],
        ['calmCorner', 'relaxar'],
      ],
    ],
    [
      'rose',
      'help',
      [
        ['askAdult', 'preguntar'],
        ['calmCorner', 'relaxar'],
      ],
    ],
  ],
  three: [
    ['green', 'calm', [['keepGoing', 'treballar']]],
    [
      'yellow',
      'restless',
      [
        ['breathe', 'respirar'],
        ['water', 'beure'],
      ],
    ],
    [
      'orange',
      'nervous',
      [
        ['pause', 'descansar'],
        ['askAdult', 'preguntar'],
      ],
    ],
  ],
};
