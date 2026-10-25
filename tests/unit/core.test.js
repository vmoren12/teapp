// @ts-check
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import { assertModule, createRegistry } from '../../core/registry.js';
import { buildShortcuts, isRemoteAllowed, matchShortcut } from '../../core/keyboard.js';
import { appData, registry } from './helpers.js';

const run = (
  /** @type {any} */ state,
  /** @type {import('../../core/types.js').Action} */ action,
) => reduce(state, action, { now: Date.UTC(2026, 9, 25), registry });

describe('accions del nucli', () => {
  it('canvia l’escenari només a mòduls d’escenari', () => {
    const data = appData();
    expect(
      run(data, { module: 'core', type: 'setStage', payload: { id: 'timer' } }).live.stage,
    ).toBe('timer');
    expect(run(data, { module: 'core', type: 'setStage', payload: { id: 'transitions' } })).toBe(
      data,
    );
  });

  it('activa la pantalla de calma i en surt en canviar d’escenari', () => {
    const calm = run(appData(), { module: 'core', type: 'toggleCalm' });
    expect(calm.live.calm).toBe(true);
    expect(
      run(calm, { module: 'core', type: 'setStage', payload: { id: 'firstThen' } }).live.calm,
    ).toBe(false);
  });

  it('desa la sessió com a plantilla nova i després la sobreescriu', () => {
    let s = appData();
    s = run(s, {
      module: 'agenda',
      type: 'remove',
      payload: { id: s.live.modules.agenda.activities[0].id },
    });
    s = run(s, { module: 'core', type: 'saveTemplate', payload: { id: 'nova', name: 'Nova' } });
    expect(s.templates).toHaveLength(2);
    expect(s.live.templateId).toBe('nova');
    expect(/** @type {any} */ (s.templates[1].content.agenda).activities).toHaveLength(2);
    s = run(s, { module: 'core', type: 'saveTemplate', payload: { id: 'nova', name: 'Nova' } });
    expect(s.templates).toHaveLength(2);
  });

  it('carregar una plantilla no la modifica en editar la sessió', () => {
    let s = run(appData(), { module: 'core', type: 'loadTemplate', payload: { id: 'tpl-1' } });
    const before = structuredClone(s.templates[0]);
    s = run(s, {
      module: 'agenda',
      type: 'update',
      payload: { id: s.live.modules.agenda.activities[0].id, patch: { label: 'Canviat' } },
    });
    expect(s.templates[0]).toEqual(before);
  });

  it('elimina, duplica i reanomena plantilles', () => {
    let s = appData();
    s = run(s, {
      module: 'core',
      type: 'duplicateTemplate',
      payload: { id: 'tpl-1', newId: 'dup', name: 'Còpia' },
    });
    s = run(s, { module: 'core', type: 'renameTemplate', payload: { id: 'dup', name: 'Altra' } });
    expect(s.templates.map((t) => t.name)).toEqual(['Prova', 'Altra']);
    s = run(s, { module: 'core', type: 'deleteTemplate', payload: { id: 'tpl-1' } });
    expect(s.templates.map((t) => t.id)).toEqual(['dup']);
    expect(s.live.templateId).toBeNull();
  });

  it('valida la configuració dels mòduls', () => {
    const s = run(appData(), {
      module: 'core',
      type: 'setModuleConfig',
      payload: { moduleId: 'timer', patch: { shape: 'bar', digits: 'xxx' } },
    });
    expect(s.live.config.timer).toMatchObject({ shape: 'bar', digits: 'minutes' });
  });

  it('ignora accions desconegudes', () => {
    const data = appData();
    expect(run(data, { module: 'inexistent', type: 'x' })).toBe(data);
    expect(run(data, { module: 'agenda', type: 'inexistent' })).toBe(data);
  });
});

describe('registre de mòduls', () => {
  it('rebutja mòduls que no compleixen el contracte', () => {
    expect(() => assertModule({ id: 'x' })).toThrow(/falta/);
    const valid = registry.get('agenda');
    expect(() => createRegistry([valid, valid])).toThrow(/duplicat/);
  });

  it('detecta dreceres repetides', () => {
    const agenda = registry.get('agenda');
    expect(() => createRegistry([agenda], { reservedKeys: ['ArrowRight'] })).toThrow(/ArrowRight/);
  });
});

describe('dreceres', () => {
  const shortcuts = buildShortcuts(registry);
  const key = (/** @type {string} */ k, /** @type {EventTarget | null} */ target = document.body) =>
    /** @type {KeyboardEvent} */ (
      /** @type {unknown} */ ({ key: k, target, ctrlKey: false, metaKey: false, altKey: false })
    );

  it('associa les tecles dels comandaments de presentació', () => {
    expect(matchShortcut(shortcuts, key('PageDown'), 'projection')?.action).toEqual({
      module: 'agenda',
      type: 'next',
      payload: undefined,
    });
    expect(matchShortcut(shortcuts, key('.'), 'projection')?.action?.type).toBe('toggleCalm');
    expect(matchShortcut(shortcuts, key('2'), 'projection')?.action?.payload).toEqual({
      id: 'timer',
    });
  });

  it('no s’activa mentre s’escriu ni a la projecció si és només del panell', () => {
    const input = document.createElement('input');
    expect(matchShortcut(shortcuts, key('b', input), 'control')).toBeNull();
    expect(matchShortcut(shortcuts, key('?'), 'projection')).toBeNull();
    expect(matchShortcut(shortcuts, key('?'), 'control')?.command).toBe('help');
  });

  it('només accepta des de fora les accions de les dreceres', () => {
    expect(isRemoteAllowed(shortcuts, { module: 'agenda', type: 'next' })).toBe(true);
    expect(
      isRemoteAllowed(shortcuts, { module: 'core', type: 'deleteTemplate', payload: { id: 'x' } }),
    ).toBe(false);
    expect(
      isRemoteAllowed(shortcuts, { module: 'core', type: 'setStage', payload: { id: 'timer' } }),
    ).toBe(true);
  });
});
