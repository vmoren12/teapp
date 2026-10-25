// @ts-check
// Migracions del model de dades. Cada vegada que canviï l'estructura de les
// dades desades, cal:
//   1. Pujar SCHEMA_VERSION.
//   2. Afegir a MIGRATIONS una funció que converteixi de la versió anterior.
//   3. Afegir-ne un test a tests/unit/schema.test.js.
// Així les dades dels docents (i els JSON exportats) mai no es perden.

export const SCHEMA_VERSION = 3;

/** @param {unknown} value @returns {value is Record<string, any>} */
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * MIGRATIONS[n] converteix dades de la versió n a la n+1. Les reben tant les
 * dades desades (AppData) com els fitxers exportats (que no tenen `live` ni
 * `settings`), per això comproven cada part abans de tocar-la.
 * @type {Record<number, (data: any) => any>}
 */
export const MIGRATIONS = {
  // v2: el temporitzador es pot lligar a l'activitat actual de l'agenda.
  1: (data) => {
    const timer = data.live?.modules?.timer;
    if (!isRecord(timer)) return data;
    return {
      ...data,
      live: {
        ...data.live,
        modules: { ...data.live.modules, timer: { ...timer, linkedActivityId: null } },
      },
    };
  },
  // v3: alçada configurable de les franges (a la sessió i, per defecte, a la configuració).
  2: (data) => {
    const layout = { header: 'medium', footer: 'medium' };
    const out = { ...data };
    if (isRecord(data.settings)) out.settings = { ...data.settings, layout };
    if (isRecord(data.live)) {
      const config = isRecord(data.live.config) ? data.live.config : {};
      out.live = { ...data.live, config: { ...config, layout } };
    }
    return out;
  },
};

export class MigrationError extends Error {
  /** @param {'invalid' | 'newer' | 'missing-step'} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'MigrationError';
    this.code = code;
  }
}

/**
 * Porta unes dades de qualsevol versió anterior a la versió actual.
 * @param {unknown} data
 * @param {Record<number, (data: any) => any>} [migrations]
 * @param {number} [target]
 * @returns {any}
 */
export function migrate(data, migrations = MIGRATIONS, target = SCHEMA_VERSION) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new MigrationError('invalid', 'Les dades no són un objecte');
  }
  const record = /** @type {Record<string, unknown>} */ (data);
  const version = record.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new MigrationError('invalid', 'Falta schemaVersion');
  }
  if (version > target) {
    throw new MigrationError('newer', `Dades de la versió ${version}; l'app és la ${target}`);
  }
  let out = record;
  for (let v = version; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new MigrationError('missing-step', `No hi ha migració des de la ${v}`);
    out = { ...step(out), schemaVersion: v + 1 };
  }
  return out;
}
