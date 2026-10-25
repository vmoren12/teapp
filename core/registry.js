// @ts-check
// Registre de mòduls. El nucli no coneix cap mòdul concret: rep la llista
// des de modules/index.js i en comprova el contracte en arrencar.

/** @typedef {import('./types.js').TeappModule} TeappModule */

/**
 * @typedef {Object} Registry
 * @property {(id: string) => TeappModule | undefined} get
 * @property {() => TeappModule[]} all
 * @property {() => TeappModule[]} stage    Mòduls que poden ocupar l'escenari.
 * @property {() => TeappModule[]} footer   Mòduls de la franja inferior.
 */

/** @type {(keyof TeappModule)[]} */
const REQUIRED = [
  'id',
  'version',
  'nameKey',
  'icon',
  'region',
  'configSchema',
  'defaults',
  'initialState',
  'actions',
  'renderControl',
  'renderProjection',
];

/**
 * Comprova que un mòdul compleix el contracte. Llença un error clar si no.
 * @param {unknown} candidate
 * @returns {asserts candidate is TeappModule}
 */
export function assertModule(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('Mòdul invàlid');
  const mod = /** @type {Record<string, unknown>} */ (candidate);
  const name = typeof mod.id === 'string' ? mod.id : '?';
  for (const prop of REQUIRED) {
    if (mod[prop] === undefined) throw new Error(`Mòdul «${name}»: falta «${prop}»`);
  }
  if (!/^[a-z][a-zA-Z0-9]*$/.test(String(mod.id))) {
    throw new Error(`Mòdul «${name}»: l'id ha de ser camelCase`);
  }
  if (mod.region !== 'stage' && mod.region !== 'footer') {
    throw new Error(`Mòdul «${name}»: region ha de ser 'stage' o 'footer'`);
  }
  for (const fn of ['defaults', 'initialState', 'renderControl', 'renderProjection']) {
    if (typeof mod[fn] !== 'function') throw new Error(`Mòdul «${name}»: «${fn}» no és una funció`);
  }
}

/**
 * @param {unknown[]} modules
 * @param {{ reservedKeys?: string[] }} [options]  Tecles que ja fa servir el nucli.
 * @returns {Registry}
 */
export function createRegistry(modules, { reservedKeys = [] } = {}) {
  /** @type {Map<string, TeappModule>} */
  const byId = new Map();
  /** @type {Map<string, string>} */
  const keyOwner = new Map(reservedKeys.map((k) => [k, 'core']));

  for (const candidate of modules) {
    assertModule(candidate);
    const mod = candidate;
    if (byId.has(mod.id)) throw new Error(`Mòdul duplicat: «${mod.id}»`);
    for (const binding of mod.keys ?? []) {
      if (!mod.actions[binding.action]) {
        throw new Error(`Mòdul «${mod.id}»: la drecera apunta a una acció inexistent`);
      }
      for (const key of binding.keys) {
        const owner = keyOwner.get(key);
        if (owner) throw new Error(`La tecla «${key}» ja la fa servir «${owner}»`);
        keyOwner.set(key, mod.id);
      }
    }
    byId.set(mod.id, mod);
  }

  const all = [...byId.values()];
  return {
    get: (id) => byId.get(id),
    all: () => all,
    stage: () => all.filter((m) => m.region === 'stage'),
    footer: () => all.filter((m) => m.region === 'footer'),
  };
}
