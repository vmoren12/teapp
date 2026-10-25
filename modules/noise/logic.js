// @ts-check
// Estat desat del sonòmetre: només el calibratge (el soroll de fons de l'aula
// en silenci). El nivell de cada moment NO és aquí: és un valor efímer que el
// panell envia a la projecció (ControlUi.publish) i que no es desa mai.

import { clamp, isObject } from '../../core/schema/validate.js';
import { activeBoard } from '../expectations/logic.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */

/**
 * @typedef {Object} NoiseState
 * @property {number | null} quietDb   Volum de l'aula en silenci (dBFS), o null si no s'ha calibrat.
 */

/**
 * Valor efímer que rep la projecció.
 * @typedef {{ active: boolean, level: number }} NoiseReading
 */

/** @returns {NoiseState} */
export const initialNoise = () => ({ quietDb: null });

/** @param {unknown} input @returns {NoiseState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  return {
    quietDb:
      typeof s.quietDb === 'number' && Number.isFinite(s.quietDb)
        ? clamp(s.quietDb, -100, 0)
        : null,
  };
}

/** @param {unknown} value @returns {NoiseReading | null} */
export function sanitizeReading(value) {
  if (!isObject(value) || typeof value.active !== 'boolean') return null;
  const level = Number(value.level);
  return { active: value.active, level: Number.isFinite(level) ? clamp(level, 0, 5) : 0 };
}

/**
 * Llindar de l'escala de veu. Amb «auto», el de les expectatives de l'activitat
 * («Com parlo?») o, si no n'hi ha, veu de parella (2).
 * @param {Record<string, unknown>} config
 * @param {import('../../core/types.js').LiveSession} live
 */
export function noiseLimit(config, live) {
  if (typeof config.limit === 'number') return config.limit;
  const expectations = live.modules.expectations;
  const voice = expectations ? activeBoard(expectations, live).board.voice : null;
  return voice ?? 2;
}

/** @type {Record<string, Reducer>} */
export const noiseActions = {
  calibrate: (/** @type {NoiseState} */ s, p) => {
    const db = Number(p?.quietDb);
    return Number.isFinite(db) ? { ...s, quietDb: clamp(db, -100, 0) } : s;
  },
  resetCalibration: (/** @type {NoiseState} */ s) =>
    s.quietDb === null ? s : { ...s, quietDb: null },
};
