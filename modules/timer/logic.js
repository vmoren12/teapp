// @ts-check
// Lògica pura del temporitzador. El temps restant es calcula a partir de
// `runningSince`, de manera que totes les finestres en mostren el mateix.
//
// El temporitzador pot estar LLIGAT a l'activitat actual de l'agenda. Llavors no
// té temps propi: el temps que queda i el total surten de l'agenda (durada +
// temps afegit), i qualsevol canvi a la franja (durada, «+5 min», reiniciar) es
// veu al moment. Una sola font de veritat: la pantalla mai diu dues coses
// diferents. Quan l'agenda passa a la següent activitat, el temporitzador la
// segueix. Qualsevol acció manual sobre el temporitzador el deslliga i el
// deixa amb temps propi, conservant el temps que quedava.

import { clamp, cleanText, isObject } from '../../core/schema/validate.js';
import { currentActivity, getAgenda } from '../agenda/selectors.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../../core/types.js').LiveSession} LiveSession */
/** @typedef {import('../../core/types.js').Activity} Activity */

/**
 * @typedef {Object} TimerState
 * @property {number} totalMs          Durada configurada.
 * @property {number} remainingMs      Temps restant en el moment de la darrera pausa/inici.
 * @property {number | null} runningSince  Quan s'ha posat en marxa (null = aturat).
 * @property {string} label            Text opcional («Temps per acabar la fitxa»).
 * @property {string | null} linkedActivityId  Activitat de l'agenda a què està lligat.
 */

/**
 * Temps efectiu del temporitzador (propi o calculat a partir de l'agenda).
 * @typedef {Object} TimerView
 * @property {number} totalMs
 * @property {number} remainingMs
 * @property {number | null} runningSince
 * @property {Activity | null} activity  Activitat lligada (null si té temps propi).
 * @property {boolean} orphan            Lligat a una activitat que ja no existeix.
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
  linkedActivityId: null,
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
    linkedActivityId:
      typeof input.linkedActivityId === 'string' && /^[\w-]{1,64}$/.test(input.linkedActivityId)
        ? input.linkedActivityId
        : null,
  };
}

/**
 * Temps efectiu. Si està lligat, es calcula a partir de l'agenda: l'activitat
 * actual (que és la lligada o, si l'agenda ha avançat, la que la segueix).
 * @param {TimerState} s
 * @param {LiveSession | null | undefined} live
 * @returns {TimerView}
 */
export function timerView(s, live) {
  const own = {
    totalMs: s.totalMs,
    remainingMs: s.remainingMs,
    runningSince: s.runningSince,
    activity: null,
    orphan: false,
  };
  if (!s.linkedActivityId || !live) return own;
  const agenda = getAgenda(live);
  if (!agenda || !agenda.activities.some((a) => a.id === s.linkedActivityId)) {
    // L'activitat s'ha esborrat: es mostra en pausa fins que es deslliga (vegeu onTick).
    return { ...own, runningSince: null, orphan: true };
  }
  const current = currentActivity(agenda);
  if (!current) {
    // La sessió de l'agenda s'ha acabat: el temporitzador queda buit.
    return {
      totalMs: s.totalMs,
      remainingMs: 0,
      runningSince: null,
      activity: null,
      orphan: false,
    };
  }
  const totalMs = current.durationMin * MINUTE + agenda.extraMs;
  return {
    totalMs,
    remainingMs: totalMs,
    // Si l'agenda té el temps aturat, el temporitzador també.
    runningSince: agenda.startedAt,
    activity: current,
    orphan: false,
  };
}

/** @param {TimerState | TimerView} s @param {number} now */
export function remaining(s, now) {
  return s.runningSince === null
    ? Math.max(0, s.remainingMs)
    : Math.max(0, s.remainingMs - (now - s.runningSince));
}

/** @param {TimerState | TimerView} s */
export const isRunning = (s) => s.runningSince !== null;

/** Fracció restant (1 = ple, 0 = buit). @param {TimerState | TimerView} s @param {number} now */
export const progress = (s, now) =>
  s.totalMs > 0 ? clamp(remaining(s, now) / s.totalMs, 0, 1) : 0;

/** @param {TimerState} s */
export const isLinked = (s) => s.linkedActivityId !== null;

/**
 * Deslliga el temporitzador i el passa a temps propi, amb el temps que quedava.
 * @param {TimerState} s @param {import('../../core/types.js').ReducerEnv} env
 * @returns {TimerState}
 */
export function detach(s, env) {
  if (!isLinked(s)) return s;
  const view = timerView(s, env.live);
  const left = remaining(view, env.now);
  const running = isRunning(view) && left > 0;
  return {
    ...s,
    totalMs: clamp(Math.max(view.totalMs, left), MIN_MS, MAX_MS),
    remainingMs: clamp(left, 0, MAX_MS),
    runningSince: running ? env.now : null,
    linkedActivityId: null,
  };
}

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
  // Totes les accions manuals (excepte el text) deslliguen el temporitzador.
  start: (s, _p, env) => start(detach(s, env), env.now),
  pause: (s, _p, env) => pause(detach(s, env), env.now),
  toggle: (s, _p, env) => {
    const own = detach(s, env);
    if (isRunning(own) && remaining(own, env.now) > 0) return pause(own, env.now);
    return start(pause(own, env.now), env.now);
  },
  reset: (s, _p, env) => {
    const own = detach(s, env);
    return { ...own, remainingMs: own.totalMs, runningSince: null };
  },
  set: (s, p, env) => {
    const minutes = Number(p?.minutes);
    return Number.isFinite(minutes) && minutes > 0
      ? withDuration(detach(s, env), minutes * MINUTE)
      : s;
  },
  add: (s, p, env) => {
    const minutes = Number(p?.minutes);
    if (!Number.isFinite(minutes)) return s;
    const own = detach(s, env);
    const left = clamp(remaining(own, env.now) + minutes * MINUTE, 0, MAX_MS);
    return {
      ...own,
      totalMs: Math.max(own.totalMs, left),
      remainingMs: left,
      runningSince: isRunning(own) ? env.now : null,
    };
  },
  setLabel: (s, p) => ({ ...s, label: cleanText(p?.label, 80) }),
  /** Lliga el temporitzador a l'activitat actual de l'agenda. */
  fromActivity: (s, _p, env) => {
    const agenda = getAgenda(env.live);
    const current = agenda && currentActivity(agenda);
    if (!current) return s;
    // Sense text propi, la projecció mostra el nom de l'activitat (i el segueix).
    return { ...s, linkedActivityId: current.id, label: '' };
  },
  /** Deslliga sense canviar el temps que queda. */
  unlink: (s, _p, env) => detach(s, env),
  /**
   * Manteniment (des del panell, vegeu onTick): si l'agenda ha avançat, el
   * vincle passa a la nova activitat actual; si l'activitat lligada s'ha
   * esborrat, es deslliga i queda en pausa amb el darrer temps conegut.
   */
  follow: (s, p, env) => {
    if (!isLinked(s)) return s;
    const agenda = getAgenda(env.live);
    const current = agenda && currentActivity(agenda);
    const exists = agenda?.activities.some((a) => a.id === s.linkedActivityId) ?? false;
    if (!exists) {
      const left = clamp(Number(p?.remainingMs) || 0, 0, MAX_MS);
      return {
        ...s,
        totalMs: clamp(Math.max(s.totalMs, left), MIN_MS, MAX_MS),
        remainingMs: left,
        runningSince: null,
        linkedActivityId: null,
      };
    }
    if (current && current.id !== s.linkedActivityId) return { ...s, linkedActivityId: current.id };
    return s;
  },
};
