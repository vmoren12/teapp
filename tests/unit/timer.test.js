// @ts-check
import { describe, expect, it } from 'vitest';
import {
  initialTimer,
  isRunning,
  progress,
  remaining,
  timerActions as T,
} from '../../modules/timer/logic.js';
import { appData, env } from './helpers.js';
import { agendaActions } from '../../modules/agenda/logic.js';

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

  it('agafa el temps que queda de l’activitat actual', () => {
    const data = appData();
    const agenda = agendaActions.start(data.live.modules.agenda, null, env(0));
    const live = { ...data.live, modules: { ...data.live.modules, agenda } };
    const s = T.fromActivity(initialTimer(), null, env(3 * MIN, live));
    expect(s.totalMs).toBe(7 * MIN);
    expect(s.label).toBe('Activitat');
  });
});
