// @ts-check
// Barres de temps sota els pictogrames de l'agenda (opció «Temps sota els
// pictogrames»). Lògica pura: què ha de mostrar cada targeta en un moment donat.

import { minutesLeft } from '../../core/clock.js';
import { isRunning, progress, remaining } from '../timer/logic.js';
import { remainingMs, statusOf } from './selectors.js';

/** @typedef {import('./logic.js').AgendaState} AgendaState */
/** @typedef {import('../timer/logic.js').TimerView} TimerView */

/**
 * Una barra de temps sota el pictograma.
 * @typedef {Object} TimeRow
 * @property {'activity' | 'timer'} kind
 * @property {number} progress  Fracció restant (1 = ple, 0 = buit).
 * @property {string} text      Minuts (buit si no se'n mostren).
 * @property {boolean} paused
 */

const MINUTE = 60_000;

/**
 * Barres de temps d'una targeta. La de l'activitat surt de l'agenda (durada i
 * temps afegit); a l'actual s'hi afegeix la del temporitzador si en porta un de
 * propi començat (si està lligat a l'activitat, és el mateix temps i no es repeteix).
 * @param {{
 *   agenda: AgendaState, index: number, timer: TimerView | null, timerLabel: string,
 *   minutes: boolean, t: import('../../core/types.js').Translate, now: number,
 * }} args
 * @returns {TimeRow[]}
 */
export function timeRows({ agenda, index, timer, timerLabel, minutes, t, now }) {
  const activity = agenda.activities[index];
  const status = statusOf(agenda, index);
  /** @param {number} ms */
  const left = (ms) => (minutes ? t('timer.minutesLeft', { count: minutesLeft(ms) }) : '');
  const duration = minutes ? t('agenda.time.duration', { count: activity.durationMin }) : '';
  if (status === 'done') return [{ kind: 'activity', progress: 0, text: '', paused: false }];
  if (status !== 'now') return [{ kind: 'activity', progress: 1, text: duration, paused: false }];

  const ms = remainingMs(agenda, now);
  const total = activity.durationMin * MINUTE + agenda.extraMs;
  /** @type {TimeRow[]} */
  const rows = [
    ms === null
      ? // El temps de l'agenda no corre: barra plena, en pausa.
        { kind: 'activity', progress: 1, text: duration, paused: true }
      : {
          kind: 'activity',
          progress: Math.min(1, Math.max(0, ms / total)),
          text: left(Math.max(0, ms)),
          paused: false,
        },
  ];
  if (timer) {
    const timerMs = remaining(timer, now);
    const started = isRunning(timer) || timerMs < timer.totalMs;
    if (started && timerMs > 0) {
      rows.push({
        kind: 'timer',
        progress: progress(timer, now),
        text: [timerLabel, left(timerMs)].filter(Boolean).join(' · '),
        paused: !isRunning(timer),
      });
    }
  }
  return rows;
}
