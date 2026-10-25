// @ts-check
import { describe, expect, it } from 'vitest';
import {
  initialTimer,
  isLinked,
  isRunning,
  progress,
  remaining,
  timerActions as T,
  timerView,
} from '../../modules/timer/logic.js';
import timerModule from '../../modules/timer/index.js';
import { appData, env } from './helpers.js';
import { agendaActions as A } from '../../modules/agenda/logic.js';

const MIN = 60_000;

describe('temporitzador', () => {
  it('compta a partir de marques horàries', () => {
    const s = T.start(initialTimer(), null, env(0));
    expect(isRunning(s)).toBe(true);
    expect(remaining(s, 2 * MIN)).toBe(3 * MIN);
    expect(progress(s, 2 * MIN)).toBeCloseTo(0.6);
    expect(remaining(s, 10 * MIN)).toBe(0);
  });

  it('fa pausa i continua on era', () => {
    let s = T.start(initialTimer(), null, env(0));
    s = T.pause(s, null, env(1 * MIN));
    expect(remaining(s, 99 * MIN)).toBe(4 * MIN);
    s = T.toggle(s, null, env(10 * MIN));
    expect(remaining(s, 11 * MIN)).toBe(3 * MIN);
  });

  it('torna a començar si s’havia acabat', () => {
    let s = T.start(initialTimer(), null, env(0));
    s = T.toggle(s, null, env(6 * MIN)); // acabat: pausa i torna a començar
    expect(remaining(s, 6 * MIN)).toBe(5 * MIN);
  });

  it('canvia la durada dins dels límits', () => {
    expect(T.set(initialTimer(), { minutes: 10 }, env(0)).totalMs).toBe(10 * MIN);
    expect(T.set(initialTimer(), { minutes: 9999 }, env(0)).totalMs).toBe(180 * MIN);
    const same = initialTimer();
    expect(T.set(same, { minutes: -1 }, env(0))).toBe(same);
  });

  it('afegeix temps sense aturar-lo', () => {
    let s = T.start(initialTimer(), null, env(0));
    s = T.add(s, { minutes: 1 }, env(1 * MIN));
    expect(remaining(s, 1 * MIN)).toBe(5 * MIN);
    expect(isRunning(s)).toBe(true);
  });
});

/**
 * Sessió amb l'agenda començada a t=0 (tres activitats de 10 min) i el
 * temporitzador lligat a l'activitat actual.
 */
function linkedSession() {
  const data = appData();
  const agenda = A.start(data.live.modules.agenda, null, env(0));
  /** @type {any} */
  let live = { ...data.live, modules: { ...data.live.modules, agenda } };
  const timer = T.fromActivity(initialTimer(), null, env(0, live));
  live = { ...live, modules: { ...live.modules, timer } };
  return live;
}

/** @param {any} live @param {string} type @param {any} [payload] @param {number} [now] */
function agendaDo(live, type, payload, now = 0) {
  const agenda = A[type](live.modules.agenda, payload, env(now, live));
  return { ...live, modules: { ...live.modules, agenda } };
}

/** @param {any} live @param {string} type @param {any} [payload] @param {number} [now] */
function timerDo(live, type, payload, now = 0) {
  const timer = T[type](live.modules.timer, payload, env(now, live));
  return { ...live, modules: { ...live.modules, timer } };
}

/** @param {any} live @param {number} now */
const left = (live, now) => remaining(timerView(live.modules.timer, live), now);

describe('temporitzador lligat a l’agenda', () => {
  it('es lliga a l’activitat actual i en fa servir el temps', () => {
    const live = linkedSession();
    expect(isLinked(live.modules.timer)).toBe(true);
    expect(live.modules.timer.linkedActivityId).toBe(live.modules.agenda.activities[0].id);
    expect(left(live, 3 * MIN)).toBe(7 * MIN);
    expect(timerView(live.modules.timer, live).activity?.label).toBe('Activitat');
  });

  it('canviar la durada de l’activitat actual canvia el temps que queda', () => {
    let live = linkedSession();
    const id = live.modules.agenda.activities[0].id;
    live = agendaDo(live, 'update', { id, patch: { durationMin: 20 } });
    expect(left(live, 3 * MIN)).toBe(17 * MIN);
    expect(timerView(live.modules.timer, live).totalMs).toBe(20 * MIN);
  });

  it('«+5 min» i «reinicia el temps» de l’agenda es veuen al temporitzador', () => {
    let live = linkedSession();
    live = agendaDo(live, 'extend', { minutes: 5 });
    expect(left(live, 3 * MIN)).toBe(12 * MIN);
    live = agendaDo(live, 'restartTime', null, 4 * MIN);
    expect(left(live, 4 * MIN)).toBe(10 * MIN);
  });

  it('una acció manual el deslliga i conserva el temps que quedava', () => {
    let live = timerDo(linkedSession(), 'add', { minutes: 1 }, 3 * MIN);
    expect(isLinked(live.modules.timer)).toBe(false);
    expect(left(live, 3 * MIN)).toBe(8 * MIN);
    expect(isRunning(live.modules.timer)).toBe(true);
    // Ja no segueix l'agenda.
    live = agendaDo(live, 'extend', { minutes: 5 });
    expect(left(live, 3 * MIN)).toBe(8 * MIN);
  });

  it('«set» el deslliga amb la durada nova', () => {
    const live = timerDo(linkedSession(), 'set', { minutes: 3 }, 2 * MIN);
    expect(isLinked(live.modules.timer)).toBe(false);
    expect(live.modules.timer.totalMs).toBe(3 * MIN);
  });

  it('«deslliga» conserva el temps i continua comptant', () => {
    const live = timerDo(linkedSession(), 'unlink', null, 4 * MIN);
    expect(isLinked(live.modules.timer)).toBe(false);
    expect(remaining(live.modules.timer, 5 * MIN)).toBe(5 * MIN);
  });

  it('segueix l’agenda quan passa a la següent activitat', () => {
    let live = agendaDo(linkedSession(), 'next', null, 6 * MIN);
    expect(left(live, 6 * MIN)).toBe(10 * MIN);
    expect(timerView(live.modules.timer, live).activity?.id).toBe(
      live.modules.agenda.activities[1].id,
    );
    live = timerDo(live, 'follow', null, 6 * MIN);
    expect(live.modules.timer.linkedActivityId).toBe(live.modules.agenda.activities[1].id);
  });

  it('esborrar l’activitat lligada el deslliga i el deixa en pausa', () => {
    let live = linkedSession();
    const id = live.modules.agenda.activities[0].id;
    live = agendaDo(live, 'remove', { id });
    expect(timerView(live.modules.timer, live).orphan).toBe(true);
    live = timerDo(live, 'follow', { remainingMs: 4 * MIN }, 6 * MIN);
    expect(isLinked(live.modules.timer)).toBe(false);
    expect(isRunning(live.modules.timer)).toBe(false);
    expect(remaining(live.modules.timer, 99 * MIN)).toBe(4 * MIN);
  });

  it('el manteniment des del panell segueix l’agenda i desfà el vincle orfe', () => {
    /** @type {any[]} */
    const sent = [];
    const ctx = /** @type {any} */ ({ ui: null, dispatch: (/** @type {any} */ a) => sent.push(a) });
    let live = linkedSession();
    const settings = appData().settings;
    timerModule.onTick?.(ctx, { settings, live }, 2 * MIN, {});
    expect(sent).toEqual([]);
    live = agendaDo(live, 'next', null, 3 * MIN);
    timerModule.onTick?.(ctx, { settings, live }, 3 * MIN, {});
    expect(sent).toEqual([{ type: 'follow' }]);
  });

  it('el so final no sona dues vegades', () => {
    const sounds = /** @type {string[]} */ ([]);
    const ctx = /** @type {any} */ ({
      ui: { playSound: (/** @type {string} */ k) => sounds.push(k) },
      dispatch: () => {},
    });
    const live = linkedSession();
    /** @param {boolean} transitionsSound */
    const shared = (transitionsSound) => ({
      settings: appData().settings,
      live: {
        ...live,
        config: {
          ...live.config,
          timer: { ...live.config.timer, sound: true },
          transitions: { ...live.config.transitions, enabled: true, sound: transitionsSound },
        },
      },
    });
    // Els avisos de transició ja fan sonar el final: el temporitzador no el repeteix.
    let memo = {};
    for (const now of [9 * MIN, 10 * MIN, 10.5 * MIN]) {
      timerModule.onTick?.(ctx, shared(true), now, memo);
    }
    expect(sounds).toEqual([]);
    // Sense so als avisos, sona una sola vegada encara que passin més ticks.
    memo = {};
    for (const now of [9 * MIN, 10 * MIN, 10.5 * MIN, 11 * MIN]) {
      timerModule.onTick?.(ctx, shared(false), now, memo);
    }
    expect(sounds).toEqual(['end']);
  });
});
