// @ts-check
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import { defaultLayout, liveLayout, sanitizeLayout } from '../../core/layout.js';
import { sanitizeTemplate } from '../../core/schema/validate.js';
import { appData, registry } from './helpers.js';

const run = (
  /** @type {any} */ state,
  /** @type {import('../../core/types.js').Action} */ action,
) => reduce(state, action, { now: Date.UTC(2026, 9, 25), registry });

describe('alçada de les franges', () => {
  it('per defecte són les de sempre', () => {
    expect(defaultLayout()).toEqual({ header: 'medium', footer: 'medium' });
    expect(liveLayout(appData().live)).toEqual(defaultLayout());
  });

  it('valida els valors i no permet amagar la franja inferior', () => {
    expect(sanitizeLayout({ header: 'hidden', footer: 'hidden' })).toEqual({
      header: 'hidden',
      footer: 'medium',
    });
    expect(sanitizeLayout({ header: 'enorme', footer: 'large' })).toEqual({
      header: 'medium',
      footer: 'large',
    });
    expect(sanitizeLayout('x')).toEqual(defaultLayout());
  });

  it('es canvia a la sessió i es restableix amb el valor de la configuració', () => {
    let s = run(appData(), {
      module: 'core',
      type: 'setLayout',
      payload: { patch: { header: 'small' } },
    });
    expect(liveLayout(s.live)).toEqual({ header: 'small', footer: 'medium' });
    s = run(s, { module: 'core', type: 'setLayout', payload: { patch: { footer: 'nope' } } });
    expect(liveLayout(s.live).footer).toBe('medium');
    s = run(s, {
      module: 'core',
      type: 'updateSettings',
      payload: { layout: { header: 'large', footer: 'small' } },
    });
    s = run(s, { module: 'core', type: 'resetLayout' });
    expect(liveLayout(s.live)).toEqual({ header: 'large', footer: 'small' });
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
    expect(s.templates[1].config.layout).toEqual({ header: 'hidden', footer: 'medium' });

    s = run(s, {
      module: 'core',
      type: 'updateSettings',
      payload: { layout: { header: 'small', footer: 'large' } },
    });
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'tpl-1' } });
    expect(liveLayout(s.live)).toEqual({ header: 'small', footer: 'large' });
    s = run(s, { module: 'core', type: 'loadTemplate', payload: { id: 'amb' } });
    expect(liveLayout(s.live)).toEqual({ header: 'hidden', footer: 'medium' });
  });

  it('es valida en importar una plantilla', () => {
    const tpl = sanitizeTemplate(
      { id: 't', name: 'T', config: { layout: { header: 'large', footer: 'hidden' } } },
      registry,
    );
    expect(tpl?.config.layout).toEqual({ header: 'large', footer: 'medium' });
  });
});
