// @ts-check
// Totes les modificacions de l'estat passen per dispatch(action). Les accions
// són objectes JSON serialitzables: per això poden arribar del teclat, de la
// finestra de projecció o, en el futur, d'un mòbil, sense cap canvi aquí.

import { createLive, templateFromLive } from './session.js';
import { cleanText, isObject, sanitizeConfig, sanitizeSettings } from './schema/validate.js';

/** @typedef {import('./types.js').AppData} AppData */
/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').LiveSession} LiveSession */
/** @typedef {import('./registry.js').Registry} Registry */

/**
 * @param {AppData} state
 * @param {Partial<LiveSession>} patch
 * @returns {AppData}
 */
function withLive(state, patch) {
  return { ...state, live: { ...state.live, ...patch } };
}

/**
 * Accions del nucli (module: 'core').
 * @param {AppData} state
 * @param {Action} action
 * @param {{ now: number, registry: Registry }} env
 * @returns {AppData}
 */
export function reduceCore(state, action, { now, registry }) {
  const p = isObject(action.payload) ? action.payload : {};
  switch (action.type) {
    case 'setStage': {
      const mod = registry.get(p.id);
      if (!mod || mod.region !== 'stage') return state;
      if (state.live.stage === mod.id && !state.live.calm) return state;
      return withLive(state, { stage: mod.id, calm: false });
    }
    case 'toggleCalm':
      return withLive(state, { calm: !state.live.calm });
    case 'setCalm':
      return withLive(state, { calm: p.calm === true });
    case 'setSessionName':
      return withLive(state, { name: cleanText(p.name, 80) });
    case 'updateSettings':
      return { ...state, settings: sanitizeSettings({ ...state.settings, ...p }) };
    case 'setModuleConfig': {
      const mod = registry.get(p.moduleId);
      if (!mod) return state;
      const merged = { ...state.live.config[mod.id], ...(isObject(p.patch) ? p.patch : {}) };
      const config = sanitizeConfig(mod.configSchema, merged, mod.defaults());
      return withLive(state, { config: { ...state.live.config, [mod.id]: config } });
    }
    case 'loadTemplate': {
      const template = state.templates.find((tpl) => tpl.id === p.id);
      if (!template) return state;
      return { ...state, live: createLive(registry, template) };
    }
    case 'newSession':
      return { ...state, live: { ...createLive(registry, null), name: cleanText(p.name, 80) } };
    case 'saveTemplate': {
      // p.id: id nou (si es desa com a nova) o id existent (si se sobreescriu).
      if (typeof p.id !== 'string') return state;
      const existing = state.templates.find((tpl) => tpl.id === p.id);
      const template = templateFromLive(state.live, registry, {
        id: p.id,
        name: cleanText(p.name, 80) || existing?.name || '',
        now,
        createdAt: existing?.createdAt,
      });
      const templates = existing
        ? state.templates.map((tpl) => (tpl.id === p.id ? template : tpl))
        : [...state.templates, template];
      return {
        ...state,
        templates,
        live: { ...state.live, templateId: p.id, name: template.name },
      };
    }
    case 'renameTemplate': {
      const name = cleanText(p.name, 80).trim();
      if (!name) return state;
      const iso = new Date(now).toISOString();
      return {
        ...state,
        templates: state.templates.map((tpl) =>
          tpl.id === p.id ? { ...tpl, name, updatedAt: iso } : tpl,
        ),
      };
    }
    case 'duplicateTemplate': {
      const source = state.templates.find((tpl) => tpl.id === p.id);
      if (!source || typeof p.newId !== 'string') return state;
      const iso = new Date(now).toISOString();
      const copy = {
        ...structuredClone(source),
        id: p.newId,
        name: cleanText(p.name, 80) || source.name,
        createdAt: iso,
        updatedAt: iso,
      };
      return { ...state, templates: [...state.templates, copy] };
    }
    case 'deleteTemplate': {
      const templates = state.templates.filter((tpl) => tpl.id !== p.id);
      if (templates.length === state.templates.length) return state;
      const live =
        state.live.templateId === p.id ? { ...state.live, templateId: null } : state.live;
      return { ...state, templates, live };
    }
    case 'addTemplates': {
      // Les plantilles ja arriben validades i amb id nous (vegeu core/io.js).
      if (!Array.isArray(p.templates) || p.templates.length === 0) return state;
      return { ...state, templates: [...state.templates, ...p.templates] };
    }
    default:
      console.warn(`Acció desconeguda: core/${action.type}`);
      return state;
  }
}

/**
 * Aplica una acció a l'estat i retorna l'estat nou (o el mateix si no canvia).
 * @param {AppData} state
 * @param {Action} action
 * @param {{ now: number, registry: Registry }} env
 * @returns {AppData}
 */
export function reduce(state, action, env) {
  if (action.module === 'core') return reduceCore(state, action, env);
  const mod = env.registry.get(action.module);
  const reducer = mod?.actions[action.type];
  if (!mod || !reducer) {
    console.warn(`Acció desconeguda: ${action.module}/${action.type}`);
    return state;
  }
  const prev = state.live.modules[mod.id];
  const next = reducer(prev, action.payload, {
    now: env.now,
    live: state.live,
    settings: state.settings,
  });
  if (next === prev) return state;
  return withLive(state, { modules: { ...state.live.modules, [mod.id]: next } });
}

/**
 * @param {{ store: import('./store.js').Store<AppData>, registry: Registry, now: () => number }} deps
 * @returns {(action: Action) => void}
 */
export function createDispatcher({ store, registry, now }) {
  return (action) => {
    const state = store.getState();
    const next = reduce(state, action, { now: now(), registry });
    if (next !== state) store.setState(next);
  };
}
