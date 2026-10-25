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

const STAGE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

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
      });
    }
  }
  return list;
}

/**
 * Accions que es poden rebre des d'una altra finestra (o un futur mòbil):
 * només les associades a dreceres. Mai editar plantilles ni dades.
 * @param {Shortcut[]} shortcuts
 * @param {Action} action
 */
export function isRemoteAllowed(shortcuts, action) {
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
 * @param {Shortcut[]} shortcuts
 * @param {KeyboardEvent} event
 * @param {'control' | 'projection'} where
 * @returns {Shortcut | null}
 */
export function matchShortcut(shortcuts, event, where) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;
  if (NATIVE_KEYS.has(event.key) && isInteractiveTarget(event.target)) return null;
  return (
    shortcuts.find(
      (s) => s.keys.includes(event.key) && (s.scope === 'all' || where === 'control'),
    ) ?? null
  );
}

/**
 * @param {{
 *   shortcuts: Shortcut[],
 *   where: 'control' | 'projection',
 *   onAction: (action: Action) => void,
 *   onCommand: (command: string) => void,
 *   isEnabled?: () => boolean,
 * }} options
 * @returns {() => void}
 */
export function attachKeyboard({ shortcuts, where, onAction, onCommand, isEnabled = () => true }) {
  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (!isEnabled() || event.defaultPrevented) return;
    // Amb un diàleg obert, el teclat és del diàleg.
    if (document.querySelector('dialog[open]')) return;
    const shortcut = matchShortcut(shortcuts, event, where);
    if (!shortcut) return;
    event.preventDefault();
    if (shortcut.action) onAction(shortcut.action);
    if (shortcut.command) onCommand(shortcut.command);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
