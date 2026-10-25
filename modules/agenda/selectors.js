// @ts-check
// Consultes sobre l'estat de l'agenda. Les fan servir l'agenda, la franja
// superior de la projecció, el temporitzador i els avisos de transició.

/** @typedef {import('./logic.js').AgendaState} AgendaState */
/** @typedef {import('../../core/types.js').Activity} Activity */
/** @typedef {'done' | 'now' | 'next' | 'later'} ActivityStatus */

/**
 * @param {import('../../core/types.js').LiveSession} live
 * @returns {AgendaState | null}
 */
export function getAgenda(live) {
  const state = live.modules.agenda;
  return state && Array.isArray(state.activities) ? state : null;
}

/** @param {AgendaState} s @param {number} index @returns {ActivityStatus} */
export function statusOf(s, index) {
  if (index < s.currentIndex) return 'done';
  if (index === s.currentIndex) return 'now';
  if (index === s.currentIndex + 1) return 'next';
  return 'later';
}

/** @param {AgendaState} s @returns {Activity | null} */
export const currentActivity = (s) => s.activities[s.currentIndex] ?? null;

/** @param {AgendaState} s @returns {Activity | null} */
export const nextActivity = (s) => s.activities[s.currentIndex + 1] ?? null;

/** @param {AgendaState} s */
export const isFinished = (s) => s.activities.length > 0 && s.currentIndex >= s.activities.length;

/** @param {AgendaState} s */
export const isRunning = (s) => s.startedAt !== null && currentActivity(s) !== null;

/**
 * Moment en què hauria d'acabar l'activitat actual, o null si el temps no corre.
 * @param {AgendaState} s
 */
export function endsAt(s) {
  const current = currentActivity(s);
  if (s.startedAt === null || !current) return null;
  return s.startedAt + current.durationMin * 60_000 + s.extraMs;
}

/** @param {AgendaState} s @param {number} now */
export function remainingMs(s, now) {
  const end = endsAt(s);
  return end === null ? null : end - now;
}

/** @param {Activity[]} activities */
export const totalMinutes = (activities) => activities.reduce((sum, a) => sum + a.durationMin, 0);
