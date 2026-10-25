// @ts-check
// Internacionalització. Els textos viuen a fitxers JSON per idioma; el català
// s'inclou sempre (és l'idioma per defecte i el de reserva).
//
// Format dels missatges:
//   "clau": "Text amb {parametre}"
//   "clau": { "one": "Queda {count} minut", "other": "Queden {count} minuts" }

import ca from './ca.json';

/** @typedef {{ code: string, name: string, dir: 'ltr' | 'rtl' }} LocaleInfo */

/** Idiomes disponibles. El nom és l'endònim (com es diu l'idioma en ell mateix). */
/** @type {LocaleInfo[]} */
export const LOCALES = [
  { code: 'ca', name: 'Català', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
];

/** @type {Record<string, () => Promise<{ default: unknown }>>} */
const loaders = {
  es: () => import('./es.json'),
  en: () => import('./en.json'),
};

/** @typedef {{ [key: string]: string | Messages | Record<string, string> }} Messages */

/** @type {Messages} */
const fallback = /** @type {Messages} */ (ca);
/** @type {Messages} */
let messages = fallback;
let current = 'ca';

/** @param {string} code */
export function localeInfo(code) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function getLocale() {
  return current;
}

/**
 * Canvia l'idioma actiu i actualitza `lang` i `dir` del document.
 * @param {string} code
 */
export async function setLocale(code) {
  const info = localeInfo(code);
  if (info.code === 'ca') {
    messages = fallback;
  } else {
    try {
      messages = /** @type {Messages} */ ((await loaders[info.code]()).default);
    } catch {
      messages = fallback;
    }
  }
  current = info.code;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = info.code;
    document.documentElement.dir = info.dir;
  }
}

/**
 * @param {Messages} source
 * @param {string} key
 * @returns {unknown}
 */
function lookup(source, key) {
  /** @type {unknown} */
  let node = source;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = /** @type {Record<string, unknown>} */ (node)[part];
  }
  return node;
}

/**
 * @param {unknown} value
 * @param {Record<string, string | number> | undefined} params
 * @returns {string | undefined}
 */
function pick(value, params) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && params && typeof params.count === 'number') {
    const forms = /** @type {Record<string, string>} */ (value);
    const rule = new Intl.PluralRules(current).select(params.count);
    return forms[rule] ?? forms.other;
  }
  return undefined;
}

/**
 * Tradueix una clau. Si no existeix a l'idioma actiu, fa servir el català;
 * si tampoc hi és, retorna la clau (així es detecta fàcilment el que falta).
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const text = pick(lookup(messages, key), params) ?? pick(lookup(fallback, key), params) ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}
