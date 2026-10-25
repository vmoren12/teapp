// @ts-check
// Arrencada del panell de control (index.html). Connecta totes les peces:
// emmagatzematge → dades → store → vistes, sincronització i teclat.

import '../styles/main.css';
import { getLocale, setLocale, t } from '../i18n/index.js';
import { createStorage } from '../storage/adapter.js';
import { createRegistry } from './registry.js';
import { MODULES } from '../modules/index.js';
import { attachKeyboard, buildShortcuts, isRemoteAllowed, RESERVED_KEYS } from './keyboard.js';
import { createStore } from './store.js';
import { createDispatcher } from './actions.js';
import { loadAppData, startPersistence } from './persistence.js';
import { createPictoLibrary } from '../pictograms/library.js';
import { TeaPicto } from '../components/tea-picto.js';
import { createBroadcastTransport } from './sync/transport.js';
import { startHost } from './sync/sync.js';
import { DATA_KEY, SYNC_CHANNEL } from './config.js';
import { newId } from './id.js';
import { now, startTicker } from './clock.js';
import { applyAppearance } from './appearance.js';
import { playChime, unlockAudio } from './sound.js';
import { isObject } from './schema/validate.js';
import { registerServiceWorker } from './pwa.js';
import { mountControlShell } from '../components/control-shell.js';
import { createAnnouncer } from '../components/toast.js';
import { openPictoPicker } from '../components/picto-picker.js';
import { openTemplatesDialog } from '../components/templates-dialog.js';
import { openSettingsDialog } from '../components/settings-dialog.js';
import { openHelpDialog } from '../components/help-dialog.js';

/** @typedef {import('./types.js').ModuleContext} ModuleContext */
/** @typedef {import('./types.js').SharedState} SharedState */

/** sessionStorage pot llençar errors si el navegador bloqueja l'emmagatzematge. */
function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function boot() {
  const root = /** @type {HTMLElement} */ (document.getElementById('app'));
  const storage = await createStorage();
  const session = safeSessionStorage();

  // L'idioma s'ha de saber abans de crear cap text (p. ex. les plantilles d'exemple).
  const saved = await storage.get(DATA_KEY).catch(() => undefined);
  await setLocale(
    isObject(saved) && isObject(saved.settings) ? String(saved.settings.locale) : 'ca',
  );

  const registry = createRegistry(MODULES, { reservedKeys: RESERVED_KEYS });
  const { data, notice } = await loadAppData({ storage, registry, t, newId, now: now(), session });
  const store = createStore(data);
  const dispatch = createDispatcher({ store, registry, now });
  const persistence = startPersistence({ store, storage, session });
  const library = createPictoLibrary(storage);
  TeaPicto.library = library;
  const shortcuts = buildShortcuts(registry);
  const announce = createAnnouncer(document.body);

  /** @returns {SharedState} */
  const shared = () => {
    const { settings, live } = store.getState();
    return { settings, live };
  };

  /** @param {'warning' | 'end'} kind */
  const playSound = (kind) => {
    const { sound } = store.getState().settings;
    if (sound.enabled) playChime(kind, sound.volume);
  };

  /** @type {import('./types.js').ControlUi} */
  const ui = {
    pickPicto: ({ query } = {}) =>
      openPictoPicker({ t, library, locale: getLocale(), query, announce }),
    announce,
    newId,
    playSound,
  };

  /** @type {Map<string, ModuleContext>} */
  const contexts = new Map();
  /** @param {string} moduleId @param {boolean} [withUi] @returns {ModuleContext} */
  const contextFor = (moduleId, withUi = true) => {
    const key = `${moduleId}:${withUi}`;
    let ctx = contexts.get(key);
    if (!ctx) {
      ctx = {
        moduleId,
        t,
        dispatch: (a) =>
          dispatch({ module: a.module ?? moduleId, type: a.type, payload: a.payload }),
        getState: shared,
        now,
        pictos: library,
        ui: withUi ? ui : null,
      };
      contexts.set(key, ctx);
    }
    return ctx;
  };

  const openProjection = () => {
    const url = new URL('projection.html', location.href).href;
    const win = window.open(url, 'teapp-projection', 'popup=yes,width=1280,height=720');
    if (win) win.focus();
    else announce(t('projection.blocked'));
  };

  applyAppearance(data.settings);
  const shell = mountControlShell(root, {
    t,
    registry,
    dispatch,
    getShared: shared,
    ctxFor: (id) => contextFor(id, true),
    viewCtxFor: (id) => contextFor(id, false),
    openProjection,
    openTemplates: () =>
      openTemplatesDialog({ t, store, dispatch, registry, library, announce, newId, now }),
    openHelp: () => openHelpDialog({ t, shortcuts }),
    openSettings: () =>
      openSettingsDialog({
        t,
        store,
        dispatch,
        playSound,
        storageKind: storage.kind,
        onLocaleChange: async () => {
          await persistence.flush();
          location.reload();
        },
        onClearData: async () => {
          persistence.stop();
          await storage.clear();
          session?.clear();
          location.reload();
        },
      }),
  });

  // Sincronització amb la finestra de projecció.
  const host = startHost({
    transport: createBroadcastTransport(SYNC_CHANNEL),
    getState: shared,
    // Des de la projecció només s'accepten les accions de les dreceres.
    onCommand: (action) => {
      if (isRemoteAllowed(shortcuts, action)) dispatch(action);
    },
    onPeersChange: (count) => shell.setPeers(count),
    onDuplicateHost: () => shell.showBanner('duplicate', t('banner.duplicate')),
  });
  shell.setPeers(0);

  store.subscribe((state, prev) => {
    if (state.settings !== prev.settings) applyAppearance(state.settings);
    if (state.settings !== prev.settings || state.live !== prev.live) {
      shell.update(shared());
      host.broadcast();
    }
  });
  shell.update(shared());

  // Cada mig segon: vistes (temps restant) i avisos sonors dels mòduls.
  /** @type {Map<string, Record<string, any>>} */
  const memos = new Map();
  startTicker((time) => {
    shell.tick(time);
    const state = shared();
    for (const mod of registry.all()) {
      if (!mod.onTick) continue;
      let memo = memos.get(mod.id);
      if (!memo) memos.set(mod.id, (memo = {}));
      mod.onTick(contextFor(mod.id), state, time, memo);
    }
  });

  attachKeyboard({
    shortcuts,
    where: 'control',
    onAction: dispatch,
    onCommand: (command) => shell.runCommand(command),
  });

  // Els navegadors només deixen sonar àudio després d'una interacció.
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  window.addEventListener('pagehide', () => {
    persistence.flush();
    host.stop();
  });

  if (notice === 'recovered') shell.showBanner('recovered', t('banner.recovered'));
  if (notice === 'newer') shell.showBanner('newer', t('banner.newer'));
  if (storage.kind === 'memory') shell.showBanner('memory', t('banner.memory'));

  registerServiceWorker({
    onUpdateReady: (apply) =>
      shell.showBanner('update', t('banner.update'), {
        label: t('banner.updateAction'),
        onClick: apply,
      }),
  });
}

boot().catch((error) => {
  console.error(error);
  const root = document.getElementById('app');
  if (root) root.textContent = t('error.boot');
});
