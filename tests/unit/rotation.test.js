// @ts-check
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import { liveRotation, rotationStep, sanitizeRotation } from '../../core/rotation.js';
import { buildShortcuts, isRemoteAllowed } from '../../core/keyboard.js';
import { sanitizeTemplate } from '../../core/schema/validate.js';
import { appData, registry } from './helpers.js';

const run = (
  /** @type {any} */ state,
  /** @type {import('../../core/types.js').Action} */ action,
) => reduce(state, action, { now: Date.UTC(2026, 9, 27), registry });

const item = (/** @type {string} */ id, amount = 30, unit = 's') => ({
  module: 'core',
  type: 'setRotationItem',
  payload: { id, include: true, amount, unit },
});

describe('alternança de vistes', () => {
  it('per defecte està aturada i sense vistes', () => {
    expect(liveRotation(appData().live)).toEqual({ enabled: false, items: [] });
  });

  it('valida les vistes: només eines de l’escenari, sense repetir, en ordre i amb durada vàlida', () => {
    const ids = ['agenda', 'timer', 'firstThen'];
    const r = sanitizeRotation(
      {
        enabled: true,
        items: [
          { id: 'firstThen', amount: 0, unit: 'min' },
          { id: 'agenda', amount: 99999, unit: 's' },
          { id: 'agenda', amount: 5, unit: 's' },
          { id: 'transitions', amount: 5, unit: 's' },
          { id: 'timer', amount: 'x', unit: 'hores' },
        ],
      },
      ids,
    );
    expect(r).toEqual({
      enabled: true,
      items: [
        { id: 'agenda', amount: 3600, unit: 's' },
        { id: 'timer', amount: 30, unit: 's' },
        { id: 'firstThen', amount: 1, unit: 'min' },
      ],
    });
  });

  it('afegeix vistes amb 30 s per defecte, en canvia la durada i les treu', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'setRotationItem',
      payload: { id: 'timer', include: true },
    });
    expect(liveRotation(s.live).items).toEqual([{ id: 'timer', amount: 30, unit: 's' }]);
    s = run(s, item('agenda', 2, 'min'));
    expect(liveRotation(s.live).items.map((i) => i.id)).toEqual(['agenda', 'timer']);
    s = run(s, { module: 'core', type: 'setRotationItem', payload: { id: 'timer', unit: 'min' } });
    expect(liveRotation(s.live).items[1]).toEqual({ id: 'timer', amount: 30, unit: 'min' });
    s = run(s, {
      module: 'core',
      type: 'setRotationItem',
      payload: { id: 'timer', include: false },
    });
    expect(liveRotation(s.live).items.map((i) => i.id)).toEqual(['agenda']);
  });

  it('en activar-se, si el que es mostra no és a la llista, passa a la primera vista', () => {
    let s = run(appData(), { module: 'core', type: 'setStage', payload: { id: 'steps' } });
    s = run(s, item('agenda'));
    s = run(s, item('timer'));
    expect(s.live.stage).toBe('steps');
    s = run(s, { module: 'core', type: 'toggleRotation' });
    expect(liveRotation(s.live).enabled).toBe(true);
    expect(s.live.stage).toBe('agenda');
  });

  it('canvia de vista quan s’acaba el temps de cadascuna i torna a començar', () => {
    let s = run(appData(), item('agenda', 30, 's'));
    s = run(s, item('timer', 1, 'min'));
    s = run(s, { module: 'core', type: 'setRotation', payload: { patch: { enabled: true } } });
    const memo = {};
    expect(rotationStep(s.live, memo, 0)).toBeNull(); // primer pas: comença a comptar
    expect(rotationStep(s.live, memo, 29_000)).toBeNull();
    expect(rotationStep(s.live, memo, 30_000)).toBe('timer');
    s = run(s, { module: 'core', type: 'setStage', payload: { id: 'timer' } });
    expect(rotationStep(s.live, memo, 30_500)).toBeNull(); // nova vista: torna a comptar
    expect(rotationStep(s.live, memo, 90_000)).toBeNull();
    expect(rotationStep(s.live, memo, 90_500)).toBe('agenda');
  });

  it('s’atura amb la pantalla de calma, amb una vista fora de la llista o amb una sola vista', () => {
    let s = run(appData(), item('agenda'));
    s = run(s, { module: 'core', type: 'setRotation', payload: { patch: { enabled: true } } });
    const memo = {};
    rotationStep(s.live, memo, 0);
    expect(rotationStep(s.live, memo, 60_000)).toBeNull(); // una sola vista

    s = run(s, item('timer'));
    rotationStep(s.live, memo, 60_000);
    const calm = run(s, { module: 'core', type: 'toggleCalm' });
    expect(rotationStep(calm.live, memo, 120_000)).toBeNull();
    expect(rotationStep(s.live, memo, 121_000)).toBeNull(); // en sortir de la calma, compta de nou

    const other = run(s, { module: 'core', type: 'setStage', payload: { id: 'steps' } });
    rotationStep(other.live, memo, 0);
    expect(rotationStep(other.live, memo, 600_000)).toBeNull();
  });

  it('es pot editar des de la finestra de projecció', () => {
    const shortcuts = buildShortcuts(registry);
    for (const type of ['setRotation', 'toggleRotation', 'setRotationItem', 'setStage']) {
      expect(isRemoteAllowed(shortcuts, { module: 'core', type }, registry)).toBe(true);
    }
    expect(isRemoteAllowed(shortcuts, { module: 'core', type: 'deleteTemplate' }, registry)).toBe(
      false,
    );
  });

  it('viatja amb les plantilles i es valida en importar-les', () => {
    let s = run(appData(), item('agenda'));
    s = run(s, item('timer', 2, 'min'));
    s = run(s, { module: 'core', type: 'saveTemplate', payload: { id: 'alt', name: 'Alterna' } });
    const saved = s.templates.find((/** @type {any} */ tpl) => tpl.id === 'alt');
    expect(saved?.config.rotation.items).toHaveLength(2);
    s = run(s, { module: 'core', type: 'newSession', payload: { name: 'Nova' } });
    expect(liveRotation(s.live).items).toEqual([]);
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'alt' } });
    expect(liveRotation(s.live).items[1]).toEqual({ id: 'timer', amount: 2, unit: 'min' });

    const tpl = sanitizeTemplate(
      { id: 't', name: 'T', config: { rotation: { enabled: 'sí', items: [{ id: 'nope' }] } } },
      registry,
    );
    expect(tpl?.config.rotation).toEqual({ enabled: false, items: [] });
  });
});
