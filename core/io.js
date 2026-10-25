// @ts-check
// Exportació i importació de plantilles en JSON. Les imatges pròpies del docent
// viatgen dins del fitxer (com a data URL) perquè una plantilla es pugui
// compartir amb un altre docent. Els pictogrames d'ARASAAC només es referencien.

import { migrate, SCHEMA_VERSION } from './schema/migrations.js';
import { isObject, sanitizeTemplate } from './schema/validate.js';

/** @typedef {import('./types.js').Template} Template */

export const EXPORT_APP = 'teapp';
export const EXPORT_KIND = 'templates';

export class ImportError extends Error {
  /** @param {'json' | 'format' | 'newer' | 'empty'} code */
  constructor(code) {
    super(code);
    this.name = 'ImportError';
    this.code = code;
  }
}

/**
 * Totes les referències a imatges pròpies que hi ha dins d'un valor.
 * @param {unknown} value
 * @param {Map<string, string>} [found]  id → text alternatiu
 */
export function collectLocalPictos(value, found = new Map()) {
  if (Array.isArray(value)) value.forEach((v) => collectLocalPictos(v, found));
  else if (isObject(value)) {
    if (value.source === 'local' && typeof value.id === 'string') {
      found.set(value.id, typeof value.alt === 'string' ? value.alt : '');
    }
    Object.values(value).forEach((v) => collectLocalPictos(v, found));
  }
  return found;
}

/**
 * @param {Template[]} templates
 * @param {import('../pictograms/library.js').PictoLibrary} library
 * @param {number} now
 */
export async function buildTemplatesExport(templates, library, now) {
  /** @type {Record<string, { label: string, dataUrl: string }>} */
  const pictos = {};
  for (const [id, label] of collectLocalPictos(templates)) {
    const dataUrl = await library.toDataUrl({ source: 'local', id, alt: label });
    if (dataUrl) pictos[id] = { label, dataUrl };
  }
  return {
    app: EXPORT_APP,
    kind: EXPORT_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    templates,
    pictos,
  };
}

/**
 * Llegeix un fitxer exportat, el migra si és antic i el valida.
 * Les plantilles importades reben id nous (no xoquen amb les existents).
 * @param {string} text
 * @param {{
 *   registry: import('./registry.js').Registry,
 *   library: import('../pictograms/library.js').PictoLibrary,
 *   newId: () => string,
 * }} deps
 * @returns {Promise<{ templates: Template[], skipped: number }>}
 */
export async function readTemplatesImport(text, { registry, library, newId }) {
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('json');
  }
  if (!isObject(parsed) || parsed.app !== EXPORT_APP || parsed.kind !== EXPORT_KIND) {
    throw new ImportError('format');
  }
  /** @type {any} */
  let data;
  try {
    data = migrate(parsed);
  } catch (error) {
    throw new ImportError(/** @type {any} */ (error).code === 'newer' ? 'newer' : 'format');
  }
  const list = Array.isArray(data.templates) ? data.templates : [];
  /** @type {Template[]} */
  const templates = [];
  for (const raw of list) {
    const tpl = sanitizeTemplate(raw, registry);
    if (tpl) templates.push({ ...tpl, id: newId() });
  }
  if (templates.length === 0) throw new ImportError('empty');

  const pictos = isObject(data.pictos) ? data.pictos : {};
  for (const [id, entry] of Object.entries(pictos)) {
    if (isObject(entry) && typeof entry.dataUrl === 'string') {
      await library.importDataUrl(id, entry.dataUrl, String(entry.label ?? ''));
    }
  }
  return { templates, skipped: list.length - templates.length };
}

/**
 * Fa que el navegador descarregui un objecte com a fitxer JSON.
 * @param {unknown} data
 * @param {string} filename
 */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
