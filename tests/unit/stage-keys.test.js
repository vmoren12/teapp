// @ts-check
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../core/registry.js';
import {
  buildShortcuts,
  isRemoteAllowed,
  matchShortcut,
  RESERVED_KEYS,
} from '../../core/keyboard.js';
import { registry } from './helpers.js';

const key = (/** @type {string} */ k) =>
  /** @type {KeyboardEvent} */ (
    /** @type {unknown} */ ({
      key: k,
      target: document.body,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  );

describe('dreceres d’escenari', () => {
  const shortcuts = buildShortcuts(registry);

  it('les fletxes passen els passos quan les instruccions són a l’escenari', () => {
    expect(
      matchShortcut(shortcuts, key('ArrowRight'), 'projection', 'steps')?.action,
    ).toMatchObject({
      module: 'steps',
      type: 'next',
    });
    expect(matchShortcut(shortcuts, key('PageUp'), 'control', 'story')?.action).toMatchObject({
      module: 'story',
      type: 'prev',
    });
    expect(matchShortcut(shortcuts, key('ArrowRight'), 'control', 'turns')?.action?.module).toBe(
      'turns',
    );
  });

  it('amb un altre mòdul a l’escenari, les fletxes continuen sent de l’agenda', () => {
    for (const stage of ['agenda', 'timer', undefined]) {
      expect(
        matchShortcut(shortcuts, key('ArrowRight'), 'projection', stage)?.action,
      ).toMatchObject({
        module: 'agenda',
        type: 'next',
      });
    }
  });

  it('accepta des de la projecció les accions de les dreceres d’escenari', () => {
    expect(isRemoteAllowed(shortcuts, { module: 'steps', type: 'next' })).toBe(true);
    expect(isRemoteAllowed(shortcuts, { module: 'steps', type: 'remove', payload: {} })).toBe(
      false,
    );
  });

  it('el desè mòdul d’escenari fa servir la tecla 0', () => {
    const stage = registry.stage();
    expect(stage.length).toBe(10);
    expect(matchShortcut(shortcuts, key('0'), 'projection')?.action?.payload).toEqual({
      id: stage[9].id,
    });
  });

  it('una drecera d’escenari no pot fer servir les tecles del nucli', () => {
    const steps = /** @type {any} */ (registry.get('steps'));
    const bad = { ...steps, keys: [{ keys: ['b'], action: 'next', descKey: 'x', when: 'stage' }] };
    expect(() => createRegistry([bad], { reservedKeys: RESERVED_KEYS })).toThrow(/«b»/);
  });

  it('no deixa fer servir ids reservats', () => {
    const steps = /** @type {any} */ (registry.get('steps'));
    expect(() => createRegistry([{ ...steps, id: 'layout', keys: [] }])).toThrow(/reservat/);
  });
});
