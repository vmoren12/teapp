// @ts-check
// Panell de control del docent: barra superior, agenda (columna esquerra),
// vista prèvia i controls dels altres mòduls (columna dreta), i mode classe.

import { h } from '../core/dom.js';
import { APP_NAME } from '../core/config.js';
import { button } from './button.js';
import { icon } from './icons.js';
import { createTabs } from './tabs.js';
import { mountProjection } from './projection-shell.js';
import { hideIdleCursor } from './idle-cursor.js';

/** @typedef {import('../core/types.js').SharedState} SharedState */
/** @typedef {import('../core/types.js').ModuleContext} ModuleContext */
/** @typedef {import('../core/types.js').View} View */

/**
 * @param {HTMLElement} root
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   registry: import('../core/registry.js').Registry,
 *   dispatch: (action: import('../core/types.js').Action) => void,
 *   getShared: () => SharedState,
 *   ctxFor: (moduleId: string) => ModuleContext,
 *   viewCtxFor: (moduleId: string) => ModuleContext,
 *   openTemplates: () => void,
 *   openSettings: () => void,
 *   openHelp: () => void,
 *   openProjection: () => void,
 * }} deps
 */
export function mountControlShell(root, deps) {
  const { t, registry, dispatch } = deps;
  /** @param {string} type @param {any} [payload] */
  const core = (type, payload) => dispatch({ module: 'core', type, payload });

  // --- Barra superior -----------------------------------------------------------
  const sessionName = h('input', {
    type: 'text',
    id: 'session-name',
    class: 'input session-name',
    maxlength: 80,
    placeholder: t('session.namePlaceholder'),
  });
  sessionName.addEventListener('input', () => core('setSessionName', { name: sessionName.value }));

  const classBtn = button({
    label: t('topbar.classMode'),
    icon: 'fullscreen',
    kbd: 'C',
    onClick: () => toggleClassMode(),
  });
  const topbar = h(
    'header',
    { class: 'topbar' },
    h(
      'div',
      { class: 'topbar__brand' },
      h('span', { class: 'logo', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
      h('h1', { class: 'topbar__title' }, APP_NAME),
    ),
    h(
      'div',
      { class: 'topbar__session' },
      h('label', { for: 'session-name', class: 'sr-only' }, t('session.nameLabel')),
      sessionName,
    ),
    h(
      'nav',
      { class: 'topbar__actions', 'aria-label': t('topbar.actions') },
      button({ label: t('topbar.templates'), icon: 'templates', onClick: deps.openTemplates }),
      button({ label: t('topbar.settings'), icon: 'settings', onClick: deps.openSettings }),
      button({ label: t('topbar.help'), icon: 'help', kbd: '?', onClick: deps.openHelp }),
      classBtn,
      button({
        label: t('topbar.projection'),
        icon: 'screen',
        variant: 'primary',
        kbd: 'P',
        onClick: deps.openProjection,
      }),
    ),
  );

  const banners = h('div', { class: 'banners' });

  // --- Columna de l'agenda ------------------------------------------------------------
  /** @type {{ view: View }[]} */
  const controlViews = [];
  const agendaMod = registry.get('agenda');
  const agendaPane = h('section', {
    class: 'pane pane--agenda',
    'aria-labelledby': 'agenda-title',
  });
  if (agendaMod)
    controlViews.push({ view: agendaMod.renderControl(agendaPane, deps.ctxFor('agenda')) });

  // --- Columna de l'escenari ----------------------------------------------------------
  const connection = h('p', { class: 'connection', dataset: { connected: 'false' } });
  const previewRoot = h('div', { class: 'preview__screen' });
  const preview = h('div', { class: 'preview', inert: true, 'aria-hidden': 'true' }, previewRoot);
  const previewView = mountProjection(previewRoot, {
    registry,
    t,
    ctxFor: deps.viewCtxFor,
    mode: 'preview',
  });

  const stageModules = registry.stage();
  const stageInputs = stageModules.map((mod, i) => {
    const input = h('input', { type: 'radio', name: 'stage', value: mod.id });
    input.addEventListener('change', () => input.checked && core('setStage', { id: mod.id }));
    return {
      id: mod.id,
      input,
      el: h(
        'label',
        { class: 'stage-option' },
        input,
        icon(mod.icon),
        h('span', null, t(mod.nameKey)),
        h('kbd', { 'aria-hidden': 'true' }, String(i + 1)),
      ),
    };
  });
  const calmBtn = button({
    label: t('calm.toggle'),
    icon: 'calm',
    kbd: 'B',
    className: 'btn--calm',
    onClick: () => core('toggleCalm'),
  });
  const stageSwitch = h(
    'div',
    { class: 'stage-switch' },
    h(
      'fieldset',
      { class: 'stage-options' },
      h('legend', { class: 'sr-only' }, t('stage.choose')),
      stageInputs.map((s) => s.el),
    ),
    calmBtn,
  );

  // Pestanyes amb els controls dels mòduls (tots menys l'agenda).
  const tabModules = registry.all().filter((m) => m.id !== 'agenda');
  /** @type {{ id: string, showBtn: HTMLButtonElement | null }[]} */
  const tabHeaders = [];
  const tabs = createTabs({
    label: t('stage.tools'),
    idPrefix: 'tools',
    tabs: tabModules.map((mod) => {
      const body = h('div', { class: 'tool-panel__body' });
      const showBtn =
        mod.region === 'stage'
          ? button({
              label: t('stage.show'),
              icon: 'screen',
              onClick: () => core('setStage', { id: mod.id }),
            })
          : null;
      tabHeaders.push({ id: mod.id, showBtn });
      const panel = h(
        'div',
        { class: 'tool-panel' },
        h(
          'div',
          { class: 'tool-panel__head' },
          h('h3', { class: 'tool-panel__title' }, t(mod.nameKey)),
          showBtn,
        ),
        body,
      );
      controlViews.push({ view: mod.renderControl(body, deps.ctxFor(mod.id)) });
      return { id: mod.id, label: t(mod.nameKey), icon: mod.icon, panel };
    }),
  });

  const stagePane = h(
    'section',
    { class: 'pane pane--stage', 'aria-labelledby': 'stage-title' },
    h(
      'div',
      { class: 'pane__head' },
      h('h2', { class: 'pane__title', id: 'stage-title' }, icon('screen'), t('stage.title')),
      connection,
    ),
    preview,
    stageSwitch,
    tabs.el,
  );

  const main = h('main', { id: 'main', class: 'workspace' }, agendaPane, stagePane);
  const skip = h('a', { href: '#main', class: 'skip-link' }, t('common.skipToContent'));
  const app = h('div', { class: 'app' }, skip, topbar, banners, main);
  root.replaceChildren(app);

  // --- Mode classe (una sola pantalla) --------------------------------------------
  /** @type {{ overlay: HTMLElement, view: ReturnType<typeof mountProjection>, stopIdle: () => void } | null} */
  let classMode = null;

  function enterClassMode() {
    if (classMode) return;
    const screen = h('div', { class: 'class-mode__screen' });
    const hint = h('p', { class: 'class-mode__hint' }, t('classMode.hint'));
    const overlay = h(
      'div',
      {
        class: 'class-mode',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('topbar.classMode'),
      },
      screen,
      hint,
    );
    document.body.append(overlay);
    app.inert = true;
    const view = mountProjection(screen, { registry, t, ctxFor: deps.viewCtxFor, mode: 'class' });
    view.update(deps.getShared());
    classMode = { overlay, view, stopIdle: hideIdleCursor(overlay) };
    overlay.tabIndex = -1;
    overlay.focus();
    overlay.requestFullscreen?.().catch(() => {});
    setTimeout(() => hint.classList.add('is-faded'), 3000);
  }

  function exitClassMode() {
    if (!classMode) return;
    const { overlay, view, stopIdle } = classMode;
    classMode = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    stopIdle();
    view.destroy();
    overlay.remove();
    app.inert = false;
    classBtn.focus();
  }

  function toggleClassMode() {
    if (classMode) exitClassMode();
    else enterClassMode();
  }

  // Si el docent surt de la pantalla completa amb Esc, sortim del mode classe.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && classMode) exitClassMode();
  });

  /** @type {Map<string, HTMLElement>} */
  const bannerEls = new Map();

  return {
    isClassMode: () => classMode !== null,
    /** @param {string} command */
    runCommand(command) {
      if (command === 'classMode') toggleClassMode();
      else if (command === 'fullscreen') {
        if (!classMode) enterClassMode();
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else classMode.overlay.requestFullscreen?.().catch(() => {});
      } else if (command === 'exit') exitClassMode();
      else if (classMode)
        return; // L'ajuda i la projecció no s'obren damunt del mode classe.
      else if (command === 'help') deps.openHelp();
      else if (command === 'openProjection') deps.openProjection();
    },
    /** @param {SharedState} state */
    update(state) {
      if (document.activeElement !== sessionName && sessionName.value !== state.live.name) {
        sessionName.value = state.live.name;
      }
      document.title = state.live.name ? `${state.live.name} · ${APP_NAME}` : APP_NAME;
      for (const s of stageInputs) s.input.checked = s.id === state.live.stage;
      calmBtn.setAttribute('aria-pressed', String(state.live.calm));
      for (const { id, showBtn } of tabHeaders) {
        if (!showBtn) continue;
        const showing = state.live.stage === id && !state.live.calm;
        showBtn.disabled = showing;
        showBtn
          .querySelector('.btn__label')
          ?.replaceChildren(showing ? t('stage.showing') : t('stage.show'));
      }
      previewView.update(state);
      classMode?.view.update(state);
      for (const { view } of controlViews) view.update(state);
    },
    /** @param {number} now */
    tick(now) {
      previewView.tick(now);
      classMode?.view.tick(now);
      for (const { view } of controlViews) view.tick?.(now);
    },
    /** @param {number} peers */
    setPeers(peers) {
      connection.dataset.connected = String(peers > 0);
      connection.replaceChildren(
        h('span', { class: 'connection__dot', 'aria-hidden': 'true' }),
        peers > 0 ? t('projection.connected') : t('projection.notConnected'),
      );
    },
    /**
     * Mostra un avís persistent a la part superior (una sola vegada per tipus).
     * @param {string} id @param {string} text
     * @param {{ label: string, onClick: () => void }} [action]
     */
    showBanner(id, text, action) {
      if (bannerEls.has(id)) return;
      const el = h(
        'div',
        { class: 'banner', role: 'status' },
        icon('info'),
        h('p', null, text),
        action
          ? button({ label: action.label, variant: 'primary', onClick: action.onClick })
          : null,
        button({
          label: t('common.dismiss'),
          icon: 'close',
          iconOnly: true,
          variant: 'ghost',
          onClick: () => {
            el.remove();
            bannerEls.delete(id);
          },
        }),
      );
      bannerEls.set(id, el);
      banners.append(el);
    },
  };
}
