// @ts-check
// Validació pròpia del model de dades. Les funcions `sanitize*` reben qualsevol
// valor (p. ex. un JSON importat) i retornen un objecte vàlid, o null si no es
// pot recuperar. Mai no confiem en dades externes sense passar per aquí.

/** @typedef {import('../types.js').Settings} Settings */
/** @typedef {import('../types.js').PictoRef} PictoRef */
/** @typedef {import('../types.js').ConfigField} ConfigField */
/** @typedef {import('../types.js').Template} Template */

export const PROFILES = /** @type {const} */ (['standard', 'high-contrast', 'minimal']);
export const MOTIONS = /** @type {const} */ (['system', 'reduced', 'gentle']);
export const TEXT_SCALES = [1, 1.25, 1.5, 1.75, 2];
export const UI_SCALES = [1, 1.125, 1.25, 1.5];
export const LOCALE_CODES = ['ca', 'es', 'en'];

/** @param {unknown} value @returns {value is Record<string, any>} */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {number} n @param {number} min @param {number} max */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** @param {unknown} value @param {number} [max] */
export function cleanText(value, max = 120) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/**
 * @param {unknown} value
 * @param {number[]} allowed
 * @param {number} fallback
 */
function oneOfNumber(value, allowed, fallback) {
  return typeof value === 'number' && allowed.includes(value) ? value : fallback;
}

/**
 * @template {string} T
 * @param {unknown} value
 * @param {readonly T[]} allowed
 * @param {T} fallback
 * @returns {T}
 */
function oneOf(value, allowed, fallback) {
  return allowed.includes(/** @type {T} */ (value)) ? /** @type {T} */ (value) : fallback;
}

/** @returns {Settings} */
export function defaultSettings() {
  return {
    locale: 'ca',
    profile: 'standard',
    textScale: 1.25,
    uiScale: 1,
    motion: 'system',
    sound: { enabled: true, volume: 0.3 },
    keepSession: true,
  };
}

/**
 * @param {unknown} input
 * @returns {Settings}
 */
export function sanitizeSettings(input) {
  const d = defaultSettings();
  if (!isObject(input)) return d;
  const sound = isObject(input.sound) ? input.sound : {};
  return {
    locale: oneOf(input.locale, LOCALE_CODES, d.locale),
    profile: oneOf(input.profile, PROFILES, d.profile),
    textScale: oneOfNumber(input.textScale, TEXT_SCALES, d.textScale),
    uiScale: oneOfNumber(input.uiScale, UI_SCALES, d.uiScale),
    motion: oneOf(input.motion, MOTIONS, d.motion),
    sound: {
      enabled: typeof sound.enabled === 'boolean' ? sound.enabled : d.sound.enabled,
      volume:
        typeof sound.volume === 'number' && Number.isFinite(sound.volume)
          ? clamp(sound.volume, 0, 1)
          : d.sound.volume,
    },
    keepSession: typeof input.keepSession === 'boolean' ? input.keepSession : d.keepSession,
  };
}

/**
 * @param {unknown} input
 * @returns {PictoRef | null}
 */
export function sanitizePictoRef(input) {
  if (!isObject(input)) return null;
  const source = input.source === 'arasaac' || input.source === 'local' ? input.source : null;
  if (!source) return null;
  const id = typeof input.id === 'string' || typeof input.id === 'number' ? String(input.id) : '';
  // Els id d'ARASAAC són numèrics; els locals, identificadors generats per l'app.
  const valid = source === 'arasaac' ? /^\d{1,7}$/.test(id) : /^[\w-]{1,64}$/.test(id);
  if (!valid) return null;
  return { source, id, alt: cleanText(input.alt, 120) };
}

/**
 * Valida la configuració d'un mòdul segons el seu esquema. Els camps que no
 * són a l'esquema es descarten; els invàlids prenen el valor per defecte.
 * @param {ConfigField[]} schema
 * @param {unknown} input
 * @param {Record<string, unknown>} defaults
 * @returns {Record<string, unknown>}
 */
export function sanitizeConfig(schema, input, defaults) {
  const source = isObject(input) ? input : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const field of schema) {
    const value = source[field.key];
    const fallback = defaults[field.key];
    const allowed = (field.options ?? []).map((o) => o.value);
    switch (field.type) {
      case 'boolean':
        out[field.key] = typeof value === 'boolean' ? value : fallback;
        break;
      case 'select':
        out[field.key] = allowed.includes(/** @type {any} */ (value)) ? value : fallback;
        break;
      case 'number':
        out[field.key] =
          typeof value === 'number' && Number.isFinite(value)
            ? clamp(value, field.min ?? -Infinity, field.max ?? Infinity)
            : fallback;
        break;
      case 'numbers':
        out[field.key] = Array.isArray(value)
          ? [...new Set(value.filter((v) => allowed.includes(v)))].sort((a, b) => b - a)
          : fallback;
        break;
    }
  }
  return out;
}

/**
 * Valida una plantilla. El contingut de cada mòdul el valida el mateix mòdul.
 * @param {unknown} input
 * @param {import('../registry.js').Registry} registry
 * @returns {Template | null}
 */
export function sanitizeTemplate(input, registry) {
  if (!isObject(input)) return null;
  const name = cleanText(input.name, 80).trim();
  const id = typeof input.id === 'string' && /^[\w-]{1,64}$/.test(input.id) ? input.id : null;
  if (!name || !id) return null;
  const config = isObject(input.config) ? input.config : {};
  const content = isObject(input.content) ? input.content : {};
  /** @type {Template} */
  const template = {
    id,
    name,
    config: {},
    content: {},
    createdAt: cleanText(input.createdAt, 40) || new Date(0).toISOString(),
    updatedAt: cleanText(input.updatedAt, 40) || new Date(0).toISOString(),
  };
  for (const mod of registry.all()) {
    if (config[mod.id] !== undefined) {
      template.config[mod.id] = sanitizeConfig(mod.configSchema, config[mod.id], mod.defaults());
    }
    if (content[mod.id] !== undefined && mod.sanitizeContent) {
      template.content[mod.id] = mod.sanitizeContent(content[mod.id]);
    }
  }
  return template;
}
