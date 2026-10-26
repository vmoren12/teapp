// @ts-check
// Càlcul dels avisos de transició a partir de l'agenda.
// Decisió pedagògica: l'avís apareix (i sona) en arribar a cada llindar (5 → 2 → 1),
// com ho faria el docent de viva veu. Un cop és a la pantalla, el text compta els
// minuts que queden d'un en un («Queden 5», 4, 3…), sense segons: dona
// previsibilitat sense pressió constant.

import { currentActivity, nextActivity, remainingMs } from '../agenda/selectors.js';

/** @typedef {import('../agenda/logic.js').AgendaState} AgendaState */
/** @typedef {import('../../core/types.js').Activity} Activity */

/**
 * @typedef {Object} Warning
 * @property {'warn' | 'due'} kind   'warn' = queden X minuts; 'due' = és l'hora de canviar.
 * @property {number} minutes        Llindar actual (0 si 'due').
 * @property {number} left           Minuts que queden, arrodonits cap amunt (0 si 'due').
 * @property {number[]} steps        Llindars configurats, de més gran a més petit.
 * @property {number} reached        Quants llindars s'han superat.
 * @property {Activity | null} next  Activitat que ve després.
 */

/**
 * @param {AgendaState | null} agenda
 * @param {Record<string, unknown>} config
 * @param {number} now
 * @returns {Warning | null}
 */
export function computeWarning(agenda, config, now) {
  if (!agenda || config.enabled === false) return null;
  const left = remainingMs(agenda, now);
  if (left === null) return null;
  const steps = (Array.isArray(config.minutes) ? config.minutes : [])
    .filter((n) => typeof n === 'number' && n > 0)
    .sort((a, b) => b - a);
  const next = nextActivity(agenda);
  if (left <= 0) return { kind: 'due', minutes: 0, left: 0, steps, reached: steps.length, next };
  const passed = steps.filter((m) => left <= m * 60_000);
  if (passed.length === 0) return null;
  return {
    kind: 'warn',
    minutes: Math.min(...passed),
    left: Math.ceil(left / 60_000),
    steps,
    reached: passed.length,
    next,
  };
}

/**
 * Identificador de l'avís actual: canvia només quan cal tornar a avisar.
 * @param {AgendaState | null} agenda
 * @param {Warning | null} warning
 */
export function warningKey(agenda, warning) {
  if (!agenda || !warning) return '';
  return `${currentActivity(agenda)?.id}:${warning.kind}:${warning.minutes}`;
}
