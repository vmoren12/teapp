// @ts-check
// Utilitats compartides pels tests.

import { createRegistry } from '../../core/registry.js';
import { MODULES } from '../../modules/index.js';
import { RESERVED_KEYS } from '../../core/keyboard.js';
import { createLive } from '../../core/session.js';
import { defaultSettings } from '../../core/schema/validate.js';

export const registry = createRegistry(MODULES, { reservedKeys: RESERVED_KEYS });

/** Traducció falsa: retorna la clau (i els paràmetres) per poder comprovar-ho. */
/** @type {import('../../core/types.js').Translate} */
export const fakeT = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

let n = 0;
export const seqId = () => `id-${++n}`;

/**
 * @param {Partial<import('../../core/types.js').Activity>} [over]
 * @returns {import('../../core/types.js').Activity}
 */
export function activity(over = {}) {
  return { id: seqId(), label: 'Activitat', picto: null, durationMin: 10, kind: 'normal', ...over };
}

/**
 * Dades d'aplicació mínimes amb una plantilla.
 * @param {import('../../core/types.js').Activity[]} [activities]
 * @returns {import('../../core/types.js').AppData}
 */
export function appData(activities = [activity(), activity(), activity()]) {
  const template = {
    id: 'tpl-1',
    name: 'Prova',
    config: {},
    content: { agenda: { activities } },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return {
    schemaVersion: 1,
    settings: defaultSettings(),
    templates: [template],
    live: createLive(registry, template),
  };
}

/** @param {number} now @param {import('../../core/types.js').LiveSession} [live] */
export const env = (now, live) => ({
  now,
  live: live ?? appData().live,
  settings: defaultSettings(),
});
