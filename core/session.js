// @ts-check
// Creació de sessions en directe a partir de plantilles, i a l'inrevés.

import { cleanText, isObject, sanitizeConfig } from './schema/validate.js';
import { LAYOUT_KEY, sanitizeLayout } from './layout.js';

/** @typedef {import('./types.js').LiveSession} LiveSession */
/** @typedef {import('./types.js').Template} Template */
/** @typedef {import('./types.js').TeappModule} TeappModule */
/** @typedef {import('./registry.js').Registry} Registry */

/**
 * Configuració efectiva d'un mòdul: valors per defecte + els de la plantilla.
 * @param {TeappModule} mod
 * @param {unknown} stored
 */
export function moduleConfig(mod, stored) {
  const defaults = mod.defaults();
  return sanitizeConfig(
    mod.configSchema,
    { ...defaults, ...(isObject(stored) ? stored : {}) },
    defaults,
  );
}

/**
 * Crea una sessió en directe nova. Si hi ha plantilla, se'n copia el contingut
 * (la plantilla original no es modifica mai durant la classe).
 * @param {Registry} registry
 * @param {Template | null} template
 * @param {import('./types.js').Layout} [layout]  Franges per defecte (de la configuració)
 *   si la plantilla no en porta.
 * @returns {LiveSession}
 */
export function createLive(registry, template, layout) {
  /** @type {LiveSession} */
  const live = {
    templateId: template?.id ?? null,
    name: template?.name ?? '',
    stage: registry.stage()[0]?.id ?? '',
    calm: false,
    config: { [LAYOUT_KEY]: sanitizeLayout(template?.config[LAYOUT_KEY], layout) },
    modules: {},
  };
  for (const mod of registry.all()) {
    live.config[mod.id] = moduleConfig(mod, template?.config[mod.id]);
    const content = template ? structuredClone(template.content[mod.id]) : undefined;
    live.modules[mod.id] = mod.initialState(live.config[mod.id], content);
  }
  return live;
}

/**
 * Valida una sessió desada. Si s'ha afegit un mòdul nou després de desar-la,
 * se n'hi crea l'estat inicial: així afegir mòduls no trenca dades antigues.
 * @param {unknown} input
 * @param {Registry} registry
 * @returns {LiveSession | null}
 */
export function sanitizeLive(input, registry) {
  if (!isObject(input)) return null;
  const config = isObject(input.config) ? input.config : {};
  const modules = isObject(input.modules) ? input.modules : {};
  const stage =
    registry.get(input.stage)?.region === 'stage' ? input.stage : registry.stage()[0]?.id;
  /** @type {LiveSession} */
  const live = {
    templateId: typeof input.templateId === 'string' ? input.templateId : null,
    name: cleanText(input.name, 80),
    stage: stage ?? '',
    calm: input.calm === true,
    config: { [LAYOUT_KEY]: sanitizeLayout(config[LAYOUT_KEY]) },
    modules: {},
  };
  for (const mod of registry.all()) {
    live.config[mod.id] = moduleConfig(mod, config[mod.id]);
    const stored = modules[mod.id];
    if (stored === undefined) {
      live.modules[mod.id] = mod.initialState(live.config[mod.id], undefined);
    } else if (mod.sanitizeState) {
      live.modules[mod.id] = mod.sanitizeState(stored, live.config[mod.id]);
    } else {
      live.modules[mod.id] = isObject(stored)
        ? stored
        : mod.initialState(live.config[mod.id], undefined);
    }
  }
  return live;
}

/**
 * Converteix la sessió en directe en plantilla.
 * @param {LiveSession} live
 * @param {Registry} registry
 * @param {{ id: string, name: string, now: number, createdAt?: string }} meta
 * @returns {Template}
 */
export function templateFromLive(live, registry, { id, name, now, createdAt }) {
  /** @type {Record<string, unknown>} */
  const content = {};
  for (const mod of registry.all()) {
    if (mod.toTemplate) content[mod.id] = structuredClone(mod.toTemplate(live.modules[mod.id]));
  }
  const iso = new Date(now).toISOString();
  return {
    id,
    name: cleanText(name, 80).trim() || live.name,
    config: structuredClone(live.config),
    content,
    createdAt: createdAt ?? iso,
    updatedAt: iso,
  };
}
