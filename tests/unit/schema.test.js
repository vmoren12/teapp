// @ts-check
import { describe, expect, it } from 'vitest';
import { migrate, MigrationError, SCHEMA_VERSION } from '../../core/schema/migrations.js';
import {
  defaultSettings,
  sanitizeConfig,
  sanitizePictoRef,
  sanitizeSettings,
  sanitizeTemplate,
} from '../../core/schema/validate.js';
import { sanitizeAppData } from '../../core/persistence.js';
import { registry } from './helpers.js';

describe('migrate', () => {
  it('no toca dades de la versió actual', () => {
    const data = { schemaVersion: SCHEMA_VERSION, x: 1 };
    expect(migrate(data)).toEqual(data);
  });

  it('v1 → v2: el temporitzador no està lligat a l’agenda', () => {
    const out = migrate({ schemaVersion: 1, live: { modules: { timer: { totalMs: 60000 } } } });
    expect(out.live.modules.timer).toEqual({ totalMs: 60000, linkedActivityId: null });
  });

  it('v2 → v3: franges de la mida de sempre, a la sessió i a la configuració', () => {
    const out = migrate({ schemaVersion: 2, settings: { locale: 'es' }, live: { config: {} } });
    expect(out.schemaVersion).toBe(3);
    expect(out.settings).toEqual({ locale: 'es', layout: { header: 'medium', footer: 'medium' } });
    expect(out.live.config.layout).toEqual({ header: 'medium', footer: 'medium' });
  });

  it('també migra fitxers exportats (sense live ni settings)', () => {
    const file = { schemaVersion: 1, app: 'teapp', kind: 'templates', templates: [] };
    expect(migrate(file)).toEqual({ ...file, schemaVersion: SCHEMA_VERSION });
  });

  it('aplica les migracions en ordre', () => {
    const migrations = {
      1: (/** @type {any} */ d) => ({ ...d, b: 'v2' }),
      2: (/** @type {any} */ d) => ({ ...d, c: `${d.b}+v3` }),
    };
    expect(migrate({ schemaVersion: 1 }, migrations, 3)).toEqual({
      schemaVersion: 3,
      b: 'v2',
      c: 'v2+v3',
    });
  });

  it('rebutja dades sense versió, d’una versió futura o sense migració', () => {
    expect(() => migrate({})).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 99 })).toThrow(/versió 99/);
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(/No hi ha migració/);
    expect(() => migrate('text')).toThrow(MigrationError);
  });
});

describe('sanitizeSettings', () => {
  it('omple els valors que falten i descarta els invàlids', () => {
    const s = sanitizeSettings({
      profile: 'neó',
      textScale: 7,
      sound: { volume: 3 },
      locale: 'es',
    });
    expect(s.profile).toBe('standard');
    expect(s.textScale).toBe(defaultSettings().textScale);
    expect(s.sound.volume).toBe(1);
    expect(s.locale).toBe('es');
  });
});

describe('sanitizePictoRef', () => {
  it('accepta ARASAAC numèric i imatges locals', () => {
    expect(sanitizePictoRef({ source: 'arasaac', id: 2742, alt: 'Entrar' })).toEqual({
      source: 'arasaac',
      id: '2742',
      alt: 'Entrar',
    });
    expect(sanitizePictoRef({ source: 'local', id: 'abc-123', alt: '' })?.id).toBe('abc-123');
  });

  it('rebutja referències perilloses o mal formades', () => {
    expect(sanitizePictoRef({ source: 'arasaac', id: '../x' })).toBeNull();
    expect(sanitizePictoRef({ source: 'http', id: '1' })).toBeNull();
    expect(sanitizePictoRef({ source: 'local', id: '<script>' })).toBeNull();
  });
});

describe('sanitizeConfig', () => {
  const schema = /** @type {import('../../core/types.js').ConfigField[]} */ ([
    { key: 'on', type: 'boolean', labelKey: '' },
    {
      key: 'mode',
      type: 'select',
      labelKey: '',
      options: [
        { value: 'a', labelKey: '' },
        { value: 'b', labelKey: '' },
      ],
    },
    { key: 'n', type: 'number', labelKey: '', min: 1, max: 5 },
    {
      key: 'list',
      type: 'numbers',
      labelKey: '',
      options: [1, 2, 5].map((value) => ({ value, labelKey: '' })),
    },
  ]);
  const defaults = { on: true, mode: 'a', n: 2, list: [5] };

  it('valida cada tipus i descarta camps desconeguts', () => {
    const out = sanitizeConfig(
      schema,
      { on: 'sí', mode: 'b', n: 99, list: [1, 7, 5, 1], extra: 1 },
      defaults,
    );
    expect(out).toEqual({ on: true, mode: 'b', n: 5, list: [5, 1] });
  });
});

describe('sanitizeTemplate i sanitizeAppData', () => {
  it('neteja el contingut de cada mòdul', () => {
    const tpl = sanitizeTemplate(
      {
        id: 'tpl',
        name: '  Dilluns ',
        content: {
          agenda: {
            activities: [{ id: 'a1', label: 'Hola', durationMin: 999 }, { label: 'sense id' }],
          },
        },
        config: { agenda: { view: 'focus', foo: 1 } },
      },
      registry,
    );
    expect(tpl?.name).toBe('Dilluns');
    const content = /** @type {any} */ (tpl?.content.agenda);
    expect(content.activities).toHaveLength(1);
    expect(content.activities[0].durationMin).toBe(240);
    // Les opcions noves (p. ex. timeBar) agafen el valor per defecte.
    expect(tpl?.config.agenda).toEqual({
      view: 'focus',
      timeBar: 'none',
      timeBarScope: 'all',
    });
  });

  it('recupera dades parcialment corruptes sense perdre les vàlides', () => {
    const data = sanitizeAppData(
      {
        schemaVersion: 1,
        settings: null,
        templates: [{ id: 'ok', name: 'Bona' }, { name: '' }, 5],
        live: 'x',
      },
      registry,
    );
    expect(data.templates.map((t) => t.id)).toEqual(['ok']);
    expect(data.settings).toEqual(defaultSettings());
    expect(data.live.stage).toBe('agenda');
    expect(Object.keys(data.live.modules).sort()).toEqual(
      registry
        .all()
        .map((m) => m.id)
        .sort(),
    );
    expect(Object.keys(data.live.modules)).toContain('turns');
    expect(data.live.config.layout).toEqual({ header: 'medium', footer: 'medium' });
  });
});
