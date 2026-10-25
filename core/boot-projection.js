// @ts-check
// Arrencada de la finestra de projecció (projection.html). És una rèplica de
// només lectura: rep l'estat del panell de control i el mostra. Les tecles
// (comandament de presentació) es reenvien al panell.

import '../styles/main.css';
import { getLocale, setLocale, t } from '../i18n/index.js';
import { createStorage } from '../storage/adapter.js';
import { createRegistry } from './registry.js';
import { MODULES } from '../modules/index.js';
import { attachKeyboard, buildShortcuts, RESERVED_KEYS } from './keyboard.js';
import { createPictoLibrary } from '../pictograms/library.js';
import { TeaPicto } from '../components/tea-picto.js';
import { createBroadcastTransport } from './sync/transport.js';
import { startReplica } from './sync/sync.js';
import { SYNC_CHANNEL } from './config.js';
import { now, startTicker } from './clock.js';
import { applyAppearance } from './appearance.js';
import { share } from './share.js';
import { h } from './dom.js';
import { mountProjection } from '../components/projection-shell.js';
import { hideIdleCursor } from '../components/idle-cursor.js';

/** @typedef {import('./types.js').SharedState} SharedState */

async function boot() {
  const root = /** @type {HTMLElement} */ (document.getElementById('app'));
  document.body.classList.add('projection-page');
  await setLocale('ca');

  const storage = await createStorage();
  const library = createPictoLibrary(storage);
  TeaPicto.library = library;
  const registry = createRegistry(MODULES, { reservedKeys: RESERVED_KEYS });
  const shortcuts = buildShortcuts(registry);

  /** @type {SharedState | null} */
  let state = null;
  /** @type {ReturnType<typeof mountProjection> | null} */
  let shell = null;

  const showWaiting = () => {
    document.title = t('projection.title');
    root.replaceChildren(
      h(
        'div',
        { class: 'pj-waiting', role: 'main' },
        h(
          'span',
          { class: 'logo logo--large', 'aria-hidden': 'true' },
          h('span'),
          h('span'),
          h('span'),
        ),
        h('p', { class: 'pj-waiting__title' }, t('projection.waiting')),
        h('p', { class: 'pj-waiting__help' }, t('projection.waitingHelp')),
      ),
    );
  };
  showWaiting();

  /** @type {Promise<void>} */
  let queue = Promise.resolve();

  const replica = startReplica({
    transport: createBroadcastTransport(SYNC_CHANNEL),
    onState: (incoming) => {
      // Els missatges s'encadenen perquè un canvi d'idioma (asíncron) no es desordeni.
      queue = queue.then(() => apply(incoming));
    },
    onTransient: (moduleId, value) => shell?.transient(moduleId, value),
  });

  /** @param {SharedState} incoming */
  async function apply(incoming) {
    const next = share(state, incoming);
    if (next.settings.locale !== getLocale()) {
      await setLocale(next.settings.locale);
      shell?.destroy();
      shell = null;
    }
    state = next;
    applyAppearance(state.settings);
    if (!shell) {
      document.title = t('projection.title');
      const screen = h('div', { class: 'projection-root' });
      root.replaceChildren(screen);
      shell = mountProjection(screen, {
        registry,
        t,
        mode: 'window',
        ctxFor: (moduleId) => ({
          moduleId,
          t,
          dispatch: (a) =>
            replica.sendCommand({ module: a.module ?? moduleId, type: a.type, payload: a.payload }),
          getState: () => /** @type {SharedState} */ (state),
          now,
          pictos: library,
          ui: null,
        }),
      });
    }
    shell.update(state);
  }

  startTicker((time) => shell?.tick(time));

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  attachKeyboard({
    shortcuts,
    where: 'projection',
    getStage: () => state?.live.stage,
    onAction: (action) => replica.sendCommand(action),
    onCommand: (command) => {
      if (command === 'fullscreen') toggleFullscreen();
    },
  });
  root.addEventListener('dblclick', toggleFullscreen);
  hideIdleCursor(document.body);
  window.addEventListener('pagehide', () => replica.stop());
}

boot().catch((error) => {
  console.error(error);
  const root = document.getElementById('app');
  if (root) root.textContent = t('error.boot');
});
