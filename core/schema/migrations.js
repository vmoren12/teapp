// @ts-check
// Migracions del model de dades. Cada vegada que canviï l'estructura de les
// dades desades, cal:
//   1. Pujar SCHEMA_VERSION.
//   2. Afegir a MIGRATIONS una funció que converteixi de la versió anterior.
//   3. Afegir-ne un test a tests/unit/migrations.test.js.
// Així les dades dels docents (i els JSON exportats) mai no es perden.

export const SCHEMA_VERSION = 1;

/**
 * MIGRATIONS[n] converteix dades de la versió n a la n+1.
 * Exemple per a una futura versió 2:
 *   1: (data) => ({ ...data, settings: { ...data.settings, nouCamp: true } }),
 * @type {Record<number, (data: any) => any>}
 */
export const MIGRATIONS = {};

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
