// @ts-check
// Lògica pura de l'agenda (sense DOM): fàcil de provar i de llegir.

import { clamp, cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';

/** @typedef {import('../../core/types.js').Activity} Activity */
/** @typedef {import('../../core/types.js').Reducer} Reducer */

/**
 * @typedef {Object} AgendaState
 * @property {Activity[]} activities
 * @property {number} currentIndex     Activitat actual. Si és igual a la llargada, la sessió ha acabat.
 * @property {number | null} startedAt Quan ha començat l'activitat actual (ms). null = temps aturat.
 * @property {number} extraMs          Temps afegit a l'activitat actual («+5 min»).
 */

export const MIN_DURATION = 1;
export const MAX_DURATION = 240;
export const MAX_ACTIVITIES = 30;
const MINUTE = 60_000;

/**
 * @param {unknown} input
 * @returns {Activity | null}
 */
export function sanitizeActivity(input) {
  if (!isObject(input)) return null;
  const id = typeof input.id === 'string' && /^[\w-]{1,64}$/.test(input.id) ? input.id : null;
  if (!id) return null;
  const duration = Number(input.durationMin);
  return {
    id,
    label: cleanText(input.label, 60),
    picto: sanitizePictoRef(input.picto),
    durationMin: Number.isFinite(duration)
      ? clamp(Math.round(duration), MIN_DURATION, MAX_DURATION)
      : 10,
    kind: input.kind === 'change' ? 'change' : 'normal',
  };
}

/** @param {unknown} list @returns {Activity[]} */
export function sanitizeActivities(list) {
  if (!Array.isArray(list)) return [];
  const ids = new Set();
  /** @type {Activity[]} */
  const out = [];
  for (const raw of list.slice(0, MAX_ACTIVITIES)) {
    const activity = sanitizeActivity(raw);
    if (activity && !ids.has(activity.id)) {
      ids.add(activity.id);
      out.push(activity);
    }
  }
  return out;
}

/** @param {unknown} content @returns {{ activities: Activity[] }} */
export function sanitizeContent(content) {
  return { activities: sanitizeActivities(isObject(content) ? content.activities : []) };
}

/** @param {unknown} content @returns {AgendaState} */
export function initialAgenda(content) {
  return {
    activities: sanitizeContent(content).activities,
    currentIndex: 0,
    startedAt: null,
    extraMs: 0,
  };
}

/** @param {unknown} input @returns {AgendaState} */
export function sanitizeState(input) {
  if (!isObject(input)) return initialAgenda(undefined);
  const activities = sanitizeActivities(input.activities);
  const index = Number.isInteger(input.currentIndex) ? input.currentIndex : 0;
  return {
    activities,
    currentIndex: clamp(index, 0, activities.length),
    startedAt: typeof input.startedAt === 'number' ? input.startedAt : null,
    extraMs: typeof input.extraMs === 'number' ? Math.max(0, input.extraMs) : 0,
  };
}

/**
 * Va a una activitat i en reinicia el temps.
 * @param {AgendaState} s @param {number} index @param {number} now
 * @returns {AgendaState}
 */
function goTo(s, index, now) {
  const i = clamp(index, 0, s.activities.length);
  return { ...s, currentIndex: i, startedAt: i < s.activities.length ? now : null, extraMs: 0 };
}

/**
 * Insereix mantenint «l'activitat actual» com la mateixa activitat.
 * @param {AgendaState} s @param {Activity} activity @param {number} at
 * @returns {AgendaState}
 */
function insert(s, activity, at) {
  if (s.activities.length >= MAX_ACTIVITIES || s.activities.some((a) => a.id === activity.id)) {
    return s;
  }
  const pos = clamp(at, 0, s.activities.length);
  const activities = [...s.activities.slice(0, pos), activity, ...s.activities.slice(pos)];
  const shift = pos <= s.currentIndex && s.currentIndex < s.activities.length;
  return { ...s, activities, currentIndex: s.currentIndex + (shift ? 1 : 0) };
}

/** @type {Record<string, Reducer>} */
export const agendaActions = {
  /** Comença (o torna a començar) la sessió per l'activitat actual. */
  start: (/** @type {AgendaState} */ s, _p, env) => {
    if (s.activities.length === 0) return s;
    const index = s.currentIndex >= s.activities.length ? 0 : s.currentIndex;
    return { ...s, currentIndex: index, startedAt: env.now, extraMs: 0 };
  },
  stop: (/** @type {AgendaState} */ s) =>
    s.startedAt === null ? s : { ...s, startedAt: null, extraMs: 0 },
  next: (/** @type {AgendaState} */ s, _p, env) =>
    s.currentIndex >= s.activities.length ? s : goTo(s, s.currentIndex + 1, env.now),
  prev: (/** @type {AgendaState} */ s, _p, env) =>
    s.currentIndex <= 0 ? s : goTo(s, s.currentIndex - 1, env.now),
  goTo: (/** @type {AgendaState} */ s, p, env) =>
    Number.isInteger(p?.index) ? goTo(s, p.index, env.now) : s,
  extend: (/** @type {AgendaState} */ s, p) => {
    const minutes = clamp(Number(p?.minutes) || 5, 1, 60);
    return s.startedAt === null ? s : { ...s, extraMs: s.extraMs + minutes * MINUTE };
  },
  restartTime: (/** @type {AgendaState} */ s, _p, env) =>
    s.currentIndex < s.activities.length ? { ...s, startedAt: env.now, extraMs: 0 } : s,
  add: (/** @type {AgendaState} */ s, p) => {
    const activity = sanitizeActivity(p?.activity);
    if (!activity) return s;
    return insert(s, activity, Number.isInteger(p?.at) ? p.at : s.activities.length);
  },
  /** Afegeix una targeta de canvi just després de l'activitat actual. */
  insertChange: (/** @type {AgendaState} */ s, p) => {
    const activity = sanitizeActivity({ ...p?.activity, kind: 'change' });
    if (!activity) return s;
    return insert(s, activity, Math.min(s.currentIndex + 1, s.activities.length));
  },
  update: (/** @type {AgendaState} */ s, p) => {
    const index = s.activities.findIndex((a) => a.id === p?.id);
    if (index < 0 || !isObject(p?.patch)) return s;
    const merged = sanitizeActivity({ ...s.activities[index], ...p.patch, id: p.id });
    if (!merged) return s;
    const activities = s.activities.slice();
    activities[index] = merged;
    return { ...s, activities };
  },
  remove: (/** @type {AgendaState} */ s, p) => {
    const index = s.activities.findIndex((a) => a.id === p?.id);
    if (index < 0) return s;
    const activities = s.activities.filter((_, i) => i !== index);
    const currentIndex = index < s.currentIndex ? s.currentIndex - 1 : s.currentIndex;
    const removedCurrent = index === s.currentIndex;
    return {
      ...s,
      activities,
      currentIndex: clamp(currentIndex, 0, activities.length),
      startedAt: removedCurrent && currentIndex >= activities.length ? null : s.startedAt,
    };
  },
  move: (/** @type {AgendaState} */ s, p) => {
    const from = s.activities.findIndex((a) => a.id === p?.id);
    const to = from + (p?.delta === -1 ? -1 : 1);
    if (from < 0 || to < 0 || to >= s.activities.length) return s;
    const activities = s.activities.slice();
    [activities[from], activities[to]] = [activities[to], activities[from]];
    // L'activitat actual continua sent la mateixa encara que canviï de posició.
    let currentIndex = s.currentIndex;
    if (from === s.currentIndex) currentIndex = to;
    else if (to === s.currentIndex) currentIndex = from;
    return { ...s, activities, currentIndex };
  },
};
