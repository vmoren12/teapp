// @ts-check
// Càrrega i desat de les dades al navegador (a través del StorageAdapter).

import { DATA_KEY, SESSION_LIVE_KEY } from './config.js';
import { migrate, MigrationError, SCHEMA_VERSION } from './schema/migrations.js';
import { isObject, sanitizeSettings, sanitizeTemplate } from './schema/validate.js';
import { createDefaultData } from './schema/defaults.js';
import { createLive, sanitizeLive } from './session.js';

/** @typedef {import('./types.js').AppData} AppData */
/** @typedef {import('./registry.js').Registry} Registry */
/** @typedef {import('../storage/adapter.js').StorageAdapter} StorageAdapter */

/**
 * Converteix dades (ja migrades) en un AppData vàlid. Les plantilles
 * il·legibles es descarten; la resta es conserva.
 * @param {unknown} input
 * @param {Registry} registry
 * @returns {AppData}
 */
export function sanitizeAppData(input, registry) {
  const source = isObject(input) ? input : {};
  const ids = new Set();
  const templates = (Array.isArray(source.templates) ? source.templates : [])
    .map((tpl) => sanitizeTemplate(tpl, registry))
    .filter((tpl) => tpl !== null && !ids.has(tpl.id) && ids.add(tpl.id));
  const settings = sanitizeSettings(source.settings);
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    templates: /** @type {import('./types.js').Template[]} */ (templates),
    live:
      sanitizeLive(source.live, registry) ??
      createLive(registry, templates[0] ?? null, settings.layout),
  };
}

/** @param {Storage | null} session */
function readSessionLive(session) {
  try {
    const raw = session?.getItem(SESSION_LIVE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {{
 *   storage: StorageAdapter,
 *   registry: Registry,
 *   t: import('./types.js').Translate,
 *   newId: () => string,
 *   now: number,
 *   session?: Storage | null,
 * }} deps
 * @returns {Promise<{ data: AppData, notice: null | 'recovered' | 'newer' }>}
 */
export async function loadAppData({ storage, registry, t, newId, now, session = null }) {
  /** @type {unknown} */
  let raw;
  try {
    raw = await storage.get(DATA_KEY);
  } catch {
    raw = undefined;
  }
  if (raw == null) return { data: createDefaultData({ t, registry, newId, now }), notice: null };

  /** @type {unknown} */
  let migrated;
  try {
    migrated = migrate(raw);
  } catch (error) {
    // No sobreescrivim mai dades que no entenem: en fem una còpia de seguretat.
    await storage.set(`${DATA_KEY}-backup-${now}`, raw).catch(() => {});
    const newer = error instanceof MigrationError && error.code === 'newer';
    return {
      data: createDefaultData({ t, registry, newId, now }),
      notice: newer ? 'newer' : 'recovered',
    };
  }

  const data = sanitizeAppData(migrated, registry);
  if (!data.settings.keepSession) {
    data.live =
      sanitizeLive(readSessionLive(session), registry) ??
      createLive(registry, data.templates[0] ?? null, data.settings.layout);
  }
  return { data, notice: null };
}

/**
 * Desa automàticament (amb un petit retard) cada vegada que canvien les dades.
 * Si el docent no vol conservar la sessió, la sessió en directe va a
 * sessionStorage (s'esborra en tancar el navegador) i no a l'emmagatzematge.
 * @param {{
 *   store: import('./store.js').Store<AppData>,
 *   storage: StorageAdapter,
 *   session?: Storage | null,
 *   delayMs?: number,
 * }} deps
 */
export function startPersistence({ store, storage, session = null, delayMs = 400 }) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  const save = async () => {
    timer = null;
    const { settings, templates, live } = store.getState();
    const keep = settings.keepSession;
    try {
      await storage.set(DATA_KEY, {
        schemaVersion: SCHEMA_VERSION,
        settings,
        templates,
        ...(keep ? { live } : {}),
      });
    } catch (error) {
      console.error("No s'han pogut desar les dades", error);
    }
    try {
      if (keep) session?.removeItem(SESSION_LIVE_KEY);
      else session?.setItem(SESSION_LIVE_KEY, JSON.stringify(live));
    } catch {
      // sessionStorage pot no estar disponible; no és crític.
    }
  };

  const unsubscribe = store.subscribe((state, prev) => {
    if (
      state.settings === prev.settings &&
      state.templates === prev.templates &&
      state.live === prev.live
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, delayMs);
  });

  return {
    /** Desa immediatament (p. ex. abans de tancar la pàgina). */
    flush: () => {
      if (timer) clearTimeout(timer);
      return save();
    },
    stop: () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    },
  };
}
