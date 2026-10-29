// @ts-check
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import { defaultLayout, liveLayout, sanitizeLayout } from '../../core/layout.js';
import { formatTimeOfDay } from '../../core/clock.js';
import { sanitizeTemplate } from '../../core/schema/validate.js';
import { appData, registry } from './helpers.js';

const run = (
  /** @type {any} */ state,
  /** @type {import('../../core/types.js').Action} */ action,
) => reduce(state, action, { now: Date.UTC(2026, 9, 25), registry });

describe('alçada de les franges', () => {
  it('per defecte són les de sempre', () => {
    expect(defaultLayout()).toEqual({ header: 'medium', footer: 'medium', clock: 'off' });
    expect(liveLayout(appData().live)).toEqual(defaultLayout());
  });

  it('valida els valors i permet amagar totes dues franges', () => {
    expect(sanitizeLayout({ header: 'hidden', footer: 'hidden' })).toEqual({
      header: 'hidden',
      footer: 'hidden',
      clock: 'off',
    });
    expect(sanitizeLayout({ header: 'enorme', footer: 'large' })).toEqual({
      header: 'medium',
      footer: 'large',
      clock: 'off',
    });
    expect(sanitizeLayout('x')).toEqual(defaultLayout());
  });

  it('es canvia a la sessió i es restableix amb el valor de la configuració', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'setLayout',
      payload: { patch: { header: 'small' } },
    });
    expect(liveLayout(s.live)).toEqual({ header: 'small', footer: 'medium', clock: 'off' });
    s = run(s, { module: 'core', type: 'setLayout', payload: { patch: { footer: 'nope' } } });
    expect(liveLayout(s.live).footer).toBe('medium');
    s = run(s, {
      module: 'core',
      type: 'updateSettings',
      payload: { layout: { header: 'large', footer: 'small' } },
    });
    s = run(s, { module: 'core', type: 'resetLayout' });
    expect(liveLayout(s.live)).toEqual({ header: 'large', footer: 'small', clock: 'off' });
  });

  it('viatja amb les plantilles; les plantilles sense franges fan servir les de la configuració', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'setLayout',
      payload: { patch: { header: 'hidden' } },
    });
    s = run(s, {
      module: 'core',
      type: 'saveTemplate',
      payload: { id: 'amb', name: 'Amb franges' },
    });
    expect(s.templates[1].config.layout).toEqual({
      header: 'hidden',
      footer: 'medium',
      clock: 'off',
    });

    s = run(s, {
      module: 'core',
      type: 'updateSettings',
      payload: { layout: { header: 'small', footer: 'large' } },
    });
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'tpl-1' } });
    expect(liveLayout(s.live)).toEqual({ header: 'small', footer: 'large', clock: 'off' });
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'amb' } });
    expect(liveLayout(s.live)).toEqual({ header: 'hidden', footer: 'medium', clock: 'off' });
  });

  it('es valida en importar una plantilla', () => {
    const tpl = sanitizeTemplate(
      { id: 't', name: 'T', config: { layout: { header: 'large', footer: 'nope' } } },
      registry,
    );
    expect(tpl?.config.layout).toEqual({ header: 'large', footer: 'medium', clock: 'off' });
  });
});

describe('rellotge digital', () => {
  it('per defecte no surt; es pot posar a la franja superior o a la inferior', () => {
    expect(defaultLayout().clock).toBe('off');
    expect(sanitizeLayout({ header: 'small', footer: 'small', clock: 'header' }).clock).toBe(
      'header',
    );
    expect(sanitizeLayout({ clock: 'footer' }).clock).toBe('footer');
    expect(sanitizeLayout({ clock: 'stage' }).clock).toBe('off');
  });

  it('es canvia a la sessió sense tocar l’alçada de les franges i viatja amb les plantilles', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'setLayout',
      payload: { patch: { clock: 'footer' } },
    });
    expect(liveLayout(s.live)).toEqual({ header: 'medium', footer: 'medium', clock: 'footer' });
    const same = run(s, {
      module: 'core',
      type: 'setLayout',
      payload: { patch: { clock: 'footer' } },
    });
    expect(same).toBe(s);
    s = run(s, { module: 'core', type: 'saveTemplate', payload: { id: 'rel', name: 'Rellotge' } });
    expect(s.templates[1].config.layout.clock).toBe('footer');
  });

  it('les plantilles d’abans fan servir el rellotge de la configuració', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'updateSettings',
      payload: { layout: { header: 'medium', footer: 'medium', clock: 'header' } },
    });
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'tpl-1' } });
    expect(liveLayout(s.live).clock).toBe('header');
  });

  it('formata l’hora en 24 hores amb dos dígits', () => {
    expect(formatTimeOfDay(new Date(2026, 9, 29, 9, 5, 59).getTime())).toBe('09:05');
    expect(formatTimeOfDay(new Date(2026, 9, 29, 23, 40).getTime())).toBe('23:40');
  });
});
