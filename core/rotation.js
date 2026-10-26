// @ts-check
// Alternança de vistes: l'escenari passa sol d'una eina a la següent (p. ex.
// agenda 30 s → temporitzador 1 min → agenda…). Cada vista té la seva durada,
// en segons o minuts. Les vistes s'alternen en l'ordre de les eines.
//
// Es desa a la sessió (`live.config.rotation`), i per tant a les plantilles. El
// panell de control porta el temps i canvia l'escenari; la projecció i el mode
// classe només ho mostren.

// Aquest fitxer no importa res: el fan servir tant la validació (core/schema)
// com les vistes.

/**
 * @typedef {Object} RotationItem
 * @property {string} id        Mòdul de l'escenari.
 * @property {number} amount    Durada (nombre enter).
 * @property {'s' | 'min'} unit Segons o minuts.
 */
/**
 * @typedef {Object} Rotation
 * @property {boolean} enabled
 * @property {RotationItem[]} items
 */

/** Clau de `live.config` reservada per a l'alternança (cap mòdul es pot dir així). */
export const ROTATION_KEY = 'rotation';

export const ROTATION_UNITS = /** @type {const} */ (['s', 'min']);
/** Durada màxima de cada unitat (1 hora en segons, 2 hores en minuts). */
const MAX = { s: 3600, min: 120 };

/** Durada per defecte d'una vista nova: 30 segons. */
export const defaultItem = (/** @type {string} */ id) =>
  /** @type {RotationItem} */ ({ id, amount: 30, unit: 's' });

/** Durades ràpides per als menús del mode classe i de la projecció. */
export const ROTATION_PRESETS = /** @type {const} */ ([
  { amount: 15, unit: 's' },
  { amount: 30, unit: 's' },
  { amount: 45, unit: 's' },
  { amount: 1, unit: 'min' },
  { amount: 2, unit: 'min' },
  { amount: 5, unit: 'min' },
  { amount: 10, unit: 'min' },
]);

/** @returns {Rotation} */
export const defaultRotation = () => ({ enabled: false, items: [] });

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * @param {unknown} input
 * @param {readonly string[]} [stageIds]  Eines de l'escenari, en ordre. Si hi són,
 *   només es conserven aquestes i s'ordenen igual.
 * @returns {Rotation}
 */
export function sanitizeRotation(input, stageIds) {
  const source = isRecord(input) ? input : {};
  const list = Array.isArray(source.items) ? source.items : [];
  /** @type {RotationItem[]} */
  const items = [];
  for (const raw of list) {
    if (!isRecord(raw) || typeof raw.id !== 'string') continue;
    if (stageIds && !stageIds.includes(raw.id)) continue;
    if (items.some((i) => i.id === raw.id)) continue;
    const unit = raw.unit === 'min' ? 'min' : 's';
    const amount = Math.round(Number(raw.amount));
    items.push({
      id: raw.id,
      unit,
      amount: Number.isFinite(amount) ? Math.min(MAX[unit], Math.max(1, amount)) : 30,
    });
  }
  if (stageIds) items.sort((a, b) => stageIds.indexOf(a.id) - stageIds.indexOf(b.id));
  return { enabled: source.enabled === true, items };
}

/** @param {import('./types.js').LiveSession} live @returns {Rotation} */
export const liveRotation = (live) => sanitizeRotation(live.config[ROTATION_KEY]);

/** @param {{ amount: number, unit: 's' | 'min' }} item */
export const durationMs = (item) => item.amount * (item.unit === 'min' ? 60_000 : 1000);

/** L'alternança funciona si està activada i hi ha almenys dues vistes. @param {Rotation} r */
export const isRotating = (r) => r.enabled && r.items.length > 1;

/**
 * Un pas del rellotge: retorna l'eina que s'ha de mostrar ara, o null si no cal
 * canviar. `memo` recorda des de quan es mostra la vista actual. Si el docent
 * tria una altra vista, el compte torna a començar; si tria una vista que no
 * és a la llista, o hi ha la pantalla de calma, l'alternança s'atura fins que
 * se'n torni a mostrar una de la llista.
 * @param {import('./types.js').LiveSession} live
 * @param {{ stage?: string, since?: number }} memo
 * @param {number} now
 * @returns {string | null}
 */
export function rotationStep(live, memo, now) {
  const rotation = liveRotation(live);
  if (!isRotating(rotation) || live.calm || live.stage !== memo.stage || memo.since === undefined) {
    memo.stage = live.stage;
    memo.since = now;
    return null;
  }
  const index = rotation.items.findIndex((i) => i.id === live.stage);
  if (index < 0 || now - memo.since < durationMs(rotation.items[index])) return null;
  memo.since = now;
  return rotation.items[(index + 1) % rotation.items.length].id;
}
