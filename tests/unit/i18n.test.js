// @ts-check
import { afterAll, describe, expect, it } from 'vitest';
import { setLocale, t } from '../../i18n/index.js';
import ca from '../../i18n/ca.json';
import es from '../../i18n/es.json';
import en from '../../i18n/en.json';

/** Totes les claus (amb punts) d'un fitxer d'idioma. */
function keys(/** @type {any} */ obj, prefix = '') {
  /** @type {string[]} */
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const isPlural = v && typeof v === 'object' && 'other' in v;
    if (v && typeof v === 'object' && !isPlural) out.push(...keys(v, `${prefix}${k}.`));
    else out.push(`${prefix}${k}`);
  }
  return out.sort();
}

describe('i18n', () => {
  afterAll(() => setLocale('ca'));

  it('tradueix amb paràmetres i plurals', async () => {
    await setLocale('ca');
    expect(t('agenda.extend', { minutes: 5 })).toBe('+5 min');
    expect(t('transitions.left', { count: 1 })).toBe('Queda 1 minut');
    expect(t('transitions.left', { count: 2 })).toBe('Queden 2 minuts');
  });

  it('fa servir el català si falta una clau i la clau si no existeix', async () => {
    await setLocale('en');
    expect(t('status.now')).toBe('Now');
    expect(t('clau.inexistent')).toBe('clau.inexistent');
    expect(document.documentElement.lang).toBe('en');
  });

  it('tots els idiomes tenen les mateixes claus que el català', () => {
    expect(keys(es)).toEqual(keys(ca));
    expect(keys(en)).toEqual(keys(ca));
  });
});
