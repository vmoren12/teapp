// @ts-check
// Dreceres de teclat. Funcionen igual al panell, al mode classe i a la finestra
// de projecció, i són compatibles amb comandaments de presentació (que envien
// fletxes, AvPàg/RePàg, «B» o «.» per a la pantalla negra).

import { isInteractiveTarget, isTypingTarget } from './dom.js';

/** @typedef {import('./types.js').Action} Action */

/**
 * @typedef {Object} Shortcut
 * @property {string[]} keys
 * @property {string} descKey
 * @property {Record<string, string>} [descParams]  Paràmetres que també són claus i18n.
 * @property {Action} [action]     Acció d'estat (s'envia al panell de control).
 * @property {string} [command]    Ordre local de la finestra (pantalla completa, ajuda…).
 * @property {'all' | 'control'} scope
 * @property {string} [stage]      Només val mentre aquest mòdul és a l'escenari (i llavors té prioritat).
 */

/** Tecles que els elements interactius ja fan servir per a ells mateixos. */
const NATIVE_KEYS = new Set([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/** @type {Shortcut[]} */
const CORE_SHORTCUTS = [
  {
    keys: ['b', 'B', '.'],
    descKey: 'keys.calm',
    action: { module: 'core', type: 'toggleCalm' },
    scope: 'all',
  },
  { keys: ['f', 'F'], descKey: 'keys.fullscreen', command: 'fullscreen', scope: 'all' },
  { keys: ['c', 'C'], descKey: 'keys.classMode', command: 'classMode', scope: 'control' },
  { keys: ['p', 'P'], descKey: 'keys.projection', command: 'openProjection', scope: 'control' },
  { keys: ['?'], descKey: 'keys.help', command: 'help', scope: 'control' },
  { keys: ['Escape'], descKey: 'keys.exit', command: 'exit', scope: 'control' },
];

/** Tecles per posar cada mòdul a l'escenari (el desè fa servir el 0). */
export const STAGE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** Tecles reservades pel nucli: els mòduls no les poden fer servir. */
export const RESERVED_KEYS = [...CORE_SHORTCUTS.flatMap((s) => s.keys), ...STAGE_KEYS];

/**
 * Llista completa de dreceres: nucli + escenari (1–9) + mòduls.
 * @param {import('./registry.js').Registry} registry
 * @returns {Shortcut[]}
 */
export function buildShortcuts(registry) {
  /** @type {Shortcut[]} */
  const list = [...CORE_SHORTCUTS];
  registry
    .stage()
    .slice(0, STAGE_KEYS.length)
    .forEach((mod, i) => {
      list.push({
        keys: [STAGE_KEYS[i]],
        descKey: 'keys.stage',
        descParams: { name: mod.nameKey },
        action: { module: 'core', type: 'setStage', payload: { id: mod.id } },
        scope: 'all',
      });
    });
  for (const mod of registry.all()) {
    for (const binding of mod.keys ?? []) {
      list.push({
        keys: binding.keys,
        descKey: binding.descKey,
        action: { module: mod.id, type: binding.action, payload: binding.payload },
        scope: 'all',
        ...(binding.when === 'stage' ? { stage: mod.id } : {}),
      });
    }
  }
  return list;
}

/**
 * Accions que es poden rebre des d'una altra finestra (o un futur mòbil):
 * només les associades a dreceres i les que un mòdul declara a `remoteActions`
 * (p. ex. tocar una vinyeta). Mai editar plantilles ni dades.
 * @param {Shortcut[]} shortcuts
 * @param {Action} action
 * @param {import('./registry.js').Registry} [registry]
 */
export function isRemoteAllowed(shortcuts, action, registry) {
  if (
    action.module !== 'core' &&
    registry?.get(action.module)?.remoteActions?.includes(action.type)
  ) {
    return true;
  }
  return shortcuts.some(
    (s) =>
      s.scope === 'all' &&
      s.action &&
      s.action.module === action.module &&
      s.action.type === action.type &&
      JSON.stringify(s.action.payload ?? null) === JSON.stringify(action.payload ?? null),
  );
}

/**
 * Acció que faria una tecla amb aquest mòdul a l'escenari. La fan servir els
 * botons «anterior/següent» del mode classe, perquè facin igual que les fletxes.
 * @param {Shortcut[]} shortcuts @param {string} key @param {string} [stage]
 * @returns {Action | null}
 */
export function actionForKey(shortcuts, key, stage) {
  const candidates = shortcuts.filter((s) => s.action && s.scope === 'all' && s.keys.includes(key));
  const match =
    candidates.find((s) => s.stage !== undefined && s.stage === stage) ??
    candidates.find((s) => s.stage === undefined);
  return match?.action ?? null;
}

/**
 * @param {Shortcut[]} shortcuts
 * @param {KeyboardEvent} event
 * @param {'control' | 'projection'} where
 * @param {string} [stage]  Mòdul que ocupa ara l'escenari.
 * @returns {Shortcut | null}
 */
export function matchShortcut(shortcuts, event, where, stage) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;
  if (NATIVE_KEYS.has(event.key) && isInteractiveTarget(event.target)) return null;
  const candidates = shortcuts.filter(
    (s) => s.keys.includes(event.key) && (s.scope === 'all' || where === 'control'),
  );
  return (
    candidates.find((s) => s.stage !== undefined && s.stage === stage) ??
    candidates.find((s) => s.stage === undefined) ??
    null
  );
}

/**
 * @param {{
 *   shortcuts: Shortcut[],
 *   where: 'control' | 'projection',
 *   onAction: (action: Action) => void,
 *   onCommand: (command: string) => void,
 *   isEnabled?: () => boolean,
 *   getStage?: () => string | undefined,
 * }} options
 * @returns {() => void}
 */
export function attachKeyboard({
  shortcuts,
  where,
  onAction,
  onCommand,
  isEnabled = () => true,
  getStage = () => undefined,
}) {
  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (!isEnabled() || event.defaultPrevented) return;
    // Amb un diàleg obert, el teclat és del diàleg.
    if (document.querySelector('dialog[open]')) return;
    const shortcut = matchShortcut(shortcuts, event, where, getStage());
    if (!shortcut) return;
    event.preventDefault();
    if (shortcut.action) onAction(shortcut.action);
    if (shortcut.command) onCommand(shortcut.command);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
