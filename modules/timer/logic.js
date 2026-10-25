// @ts-check
// Lògica pura del temporitzador. El temps restant es calcula a partir de
// `runningSince`, de manera que totes les finestres en mostren el mateix.

import { clamp, cleanText, isObject } from '../../core/schema/validate.js';
import { currentActivity, getAgenda, remainingMs as agendaRemaining } from '../agenda/selectors.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */

/**
 * @typedef {Object} TimerState
 * @property {number} totalMs          Durada configurada.
 * @property {number} remainingMs      Temps restant en el moment de la darrera pausa/inici.
 * @property {number | null} runningSince  Quan s'ha posat en marxa (null = aturat).
 * @property {string} label            Text opcional («Temps per acabar la fitxa»).
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
export const MIN_MS = 10 * SECOND;
export const MAX_MS = 180 * MINUTE;
export const PRESETS = [1, 2, 3, 5, 10, 15, 20, 30];

/** @returns {TimerState} */
export const initialTimer = () => ({
  totalMs: 5 * MINUTE,
  remainingMs: 5 * MINUTE,
  runningSince: null,
  label: '',
});

/** @param {unknown} input @returns {TimerState} */
export function sanitizeState(input) {
  const d = initialTimer();
  if (!isObject(input)) return d;
  const total =
    typeof input.totalMs === 'number' ? clamp(input.totalMs, MIN_MS, MAX_MS) : d.totalMs;
  return {
    totalMs: total,
    remainingMs:
      typeof input.remainingMs === 'number' ? clamp(input.remainingMs, 0, MAX_MS) : total,
    runningSince: typeof input.runningSince === 'number' ? input.runningSince : null,
    label: cleanText(input.label, 80),
  };
}

/** @param {TimerState} s @param {number} now */
export function remaining(s, now) {
  return s.runningSince === null
    ? s.remainingMs
    : Math.max(0, s.remainingMs - (now - s.runningSince));
}

/** @param {TimerState} s */
export const isRunning = (s) => s.runningSince !== null;

/** Fracció restant (1 = ple, 0 = buit). @param {TimerState} s @param {number} now */
export const progress = (s, now) =>
  s.totalMs > 0 ? clamp(remaining(s, now) / s.totalMs, 0, 1) : 0;

/** @param {TimerState} s @param {number} ms */
const withDuration = (s, ms) => {
  const value = clamp(Math.round(ms), MIN_MS, MAX_MS);
  return { ...s, totalMs: value, remainingMs: value, runningSince: null };
};

/** @param {TimerState} s @param {number} now @returns {TimerState} */
const pause = (s, now) =>
  isRunning(s) ? { ...s, remainingMs: remaining(s, now), runningSince: null } : s;

/** @param {TimerState} s @param {number} now @returns {TimerState} */
const start = (s, now) => {
  if (isRunning(s)) return s;
  // Si ja s'havia acabat, torna a començar des del principi.
  const from = s.remainingMs > 0 ? s.remainingMs : s.totalMs;
  return { ...s, remainingMs: from, runningSince: now };
};

/** @type {Record<string, Reducer>} */
export const timerActions = {
  start: (s, _p, env) => start(s, env.now),
  pause: (s, _p, env) => pause(s, env.now),
  toggle: (s, _p, env) => {
    if (isRunning(s) && remaining(s, env.now) > 0) return pause(s, env.now);
    return start(pause(s, env.now), env.now);
  },
  reset: (s) => ({ ...s, remainingMs: s.totalMs, runningSince: null }),
  set: (s, p) => {
    const minutes = Number(p?.minutes);
    return Number.isFinite(minutes) && minutes > 0 ? withDuration(s, minutes * MINUTE) : s;
  },
  add: (s, p, env) => {
    const minutes = Number(p?.minutes);
    if (!Number.isFinite(minutes)) return s;
    const left = clamp(remaining(s, env.now) + minutes * MINUTE, 0, MAX_MS);
    return {
      ...s,
      totalMs: Math.max(s.totalMs, left),
      remainingMs: left,
      runningSince: isRunning(s) ? env.now : null,
    };
  },
  setLabel: (s, p) => ({ ...s, label: cleanText(p?.label, 80) }),
  /** Ajusta el temporitzador al temps que queda de l'activitat actual de l'agenda. */
  fromActivity: (s, _p, env) => {
    const agenda = getAgenda(env.live);
    const current = agenda && currentActivity(agenda);
    if (!agenda || !current) return s;
    const left = agendaRemaining(agenda, env.now) ?? current.durationMin * MINUTE;
    if (left <= 0) return s;
    return { ...withDuration(s, left), label: current.label };
  },
};
