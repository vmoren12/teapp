// @ts-check
// Dades inicials: tres plantilles d'exemple perquè el docent pugui començar
// en segons. Els textos surten dels fitxers d'idioma.

import { SCHEMA_VERSION } from './migrations.js';
import { defaultSettings } from './validate.js';
import { createLive } from '../session.js';

/** @typedef {import('../types.js').AppData} AppData */
/** @typedef {import('../types.js').Template} Template */
/** @typedef {import('../types.js').Translate} Translate */

// [clau i18n de l'activitat, id ARASAAC del paquet inicial, minuts]
/** @type {Record<string, [string, string, number][]>} */
const SAMPLE_TEMPLATES = {
  eso: [
    ['arrival', '2742', 5],
    ['explanation', '2457', 15],
    ['individual', '2599', 20],
    ['group', '31278', 15],
    ['tidy', '5514', 5],
  ],
  pfi: [
    ['welcome', '5898', 10],
    ['workshop', '6225', 40],
    ['breakfast', '4625', 20],
    ['workshop2', '6225', 30],
    ['review', '3345', 10],
  ],
  tutoring: [
    ['assembly', '27574', 10],
    ['groupActivity', '31278', 25],
    ['calm', '32826', 5],
    ['closing', '5358', 10],
  ],
};

/**
 * @param {Translate} t
 * @param {() => string} newId
 * @param {number} now
 * @returns {Template[]}
 */
export function sampleTemplates(t, newId, now) {
  const iso = new Date(now).toISOString();
  return Object.entries(SAMPLE_TEMPLATES).map(([key, rows]) => ({
    id: newId(),
    name: t(`samples.${key}.name`),
    config: {},
    content: {
      agenda: {
        activities: rows.map(([activityKey, pictoId, durationMin]) => {
          const label = t(`samples.${key}.${activityKey}`);
          return {
            id: newId(),
            label,
            picto: { source: 'arasaac', id: pictoId, alt: label },
            durationMin,
            kind: 'normal',
          };
        }),
      },
    },
    createdAt: iso,
    updatedAt: iso,
  }));
}

/**
 * @param {{ t: Translate, registry: import('../registry.js').Registry, newId: () => string, now: number }} deps
 * @returns {AppData}
 */
export function createDefaultData({ t, registry, newId, now }) {
  const templates = sampleTemplates(t, newId, now);
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    templates,
    live: createLive(registry, templates[0] ?? null),
  };
}
