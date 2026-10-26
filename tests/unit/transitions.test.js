// @ts-check
import { describe, expect, it, vi } from 'vitest';
import { computeWarning } from '../../modules/transitions/logic.js';
import transitions from '../../modules/transitions/index.js';
import { agendaActions, initialAgenda } from '../../modules/agenda/logic.js';
import { activity, appData, env } from './helpers.js';

const MIN = 60_000;
const config = { enabled: true, minutes: [5, 2, 1], sound: true };

function running() {
  const a = initialAgenda({
    activities: [activity({ durationMin: 10 }), activity({ label: 'Pati' })],
  });
  return agendaActions.start(a, null, env(0));
}

describe('avisos de transició', () => {
  it('no avisa si queda temps o si el temps no corre', () => {
    expect(computeWarning(running(), config, 2 * MIN)).toBeNull();
    expect(computeWarning(initialAgenda({ activities: [activity()] }), config, 0)).toBeNull();
  });

  it('avança per graons 5 → 2 → 1', () => {
    const s = running();
    expect(computeWarning(s, config, 5 * MIN + 1)).toMatchObject({
      kind: 'warn',
      minutes: 5,
      reached: 1,
    });
    expect(computeWarning(s, config, 8 * MIN + 1)).toMatchObject({
      kind: 'warn',
      minutes: 2,
      reached: 2,
    });
    expect(computeWarning(s, config, 9 * MIN + 30_000)).toMatchObject({
      kind: 'warn',
      minutes: 1,
      reached: 3,
    });
  });

  it('un cop avisa, compta els minuts que queden d’un en un', () => {
    const s = running();
    const left = (/** @type {number} */ t) => computeWarning(s, config, t)?.left;
    expect(left(5 * MIN)).toBe(5);
    expect(left(5 * MIN + 1)).toBe(5);
    expect(left(6 * MIN + 1)).toBe(4);
    expect(left(7 * MIN)).toBe(3);
    expect(left(7 * MIN + 1)).toBe(3);
    expect(left(8 * MIN + 1)).toBe(2);
    expect(left(9 * MIN + 30_000)).toBe(1);
    expect(computeWarning(s, config, 6 * MIN + 1)).toMatchObject({ minutes: 5, reached: 1 });
  });

  it('indica que és l’hora de canviar i quina activitat ve', () => {
    const w = computeWarning(running(), config, 10 * MIN);
    expect(w?.kind).toBe('due');
    expect(w?.next?.label).toBe('Pati');
  });

  it('respecta la desactivació', () => {
    expect(computeWarning(running(), { ...config, enabled: false }, 9 * MIN)).toBeNull();
  });

  it('fa sonar cada llindar una sola vegada i no en carregar', () => {
    const data = appData();
    const agenda = agendaActions.start(data.live.modules.agenda, null, env(0));
    const state = {
      settings: data.settings,
      live: { ...data.live, modules: { ...data.live.modules, agenda } },
    };
    const playSound = vi.fn();
    const ctx = /** @type {any} */ ({ ui: { playSound } });
    const memo = {};
    const tick = (/** @type {number} */ t) => transitions.onTick?.(ctx, state, t, memo);
    tick(6 * MIN); // primer tick (en carregar): no sona
    expect(playSound).not.toHaveBeenCalled();
    tick(6 * MIN + 500);
    expect(playSound).not.toHaveBeenCalled();
    tick(8 * MIN + 1); // passa a «queden 2 minuts»
    tick(8 * MIN + 600);
    expect(playSound).toHaveBeenCalledTimes(1);
    tick(10 * MIN);
    expect(playSound).toHaveBeenLastCalledWith('end');
  });
});
