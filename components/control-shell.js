// @ts-check
// Panell de control del docent: barra superior, agenda (columna esquerra),
// vista prèvia i controls dels altres mòduls (columna dreta), i mode classe.

import { h } from '../core/dom.js';
import {
  APP_BUILD,
  APP_BUILD_DATE,
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  CODE_LICENSE,
} from '../core/config.js';
import { logo } from './logo.js';
import { button } from './button.js';
import { icon } from './icons.js';
import { mountProjection } from './projection-shell.js';
import { hideIdleCursor } from './idle-cursor.js';
import { createLayoutControls } from './layout-controls.js';
import { createClassControls } from './class-controls.js';
import { STAGE_KEYS } from '../core/keyboard.js';

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
 *   shortcuts: import('../core/keyboard.js').Shortcut[],
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
    h('div', { class: 'topbar__brand' }, logo(), h('h1', { class: 'topbar__title' }, APP_NAME)),
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
  const layoutControls = createLayoutControls({
    t,
    setLayout: (patch) => core('setLayout', { patch }),
    resetLayout: () => core('resetLayout'),
    previewEl: preview,
    projectionRoot: () => previewView.root,
  });
  const previewWrap = h('div', { class: 'preview-wrap' }, preview, layoutControls.handles);

  const stageModules = registry.stage();
  const stageInputs = stageModules.map((mod, i) => {
    const input = h('input', { type: 'radio', name: 'stage', value: mod.id });
    input.addEventListener('change', () => input.checked && core('setStage', { id: mod.id }));
    // Tornar a clicar l'opció que ja es mostra en torna a obrir les opcions.
    input.addEventListener('click', () => openTool(mod.id));
    return {
      id: mod.id,
      input,
      el: h(
        'label',
        { class: 'stage-option' },
        input,
        icon(mod.icon),
        h('span', null, t(mod.nameKey)),
        STAGE_KEYS[i] ? h('kbd', { 'aria-hidden': 'true' }, STAGE_KEYS[i]) : null,
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
  // Accions que es poden llançar des de la pantalla de calma (p. ex. la respiració guiada).
  const calmLaunchers = registry
    .all()
    .filter((mod) => mod.calmLaunch && mod.region === 'stage')
    .map((mod) => {
      const launch = /** @type {NonNullable<typeof mod.calmLaunch>} */ (mod.calmLaunch);
      return button({
        label: t(launch.labelKey),
        icon: launch.icon,
        className: 'btn--calm-launch',
        onClick: () => {
          dispatch({ module: mod.id, type: launch.action });
          core('setStage', { id: mod.id });
        },
      });
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
    h('div', { class: 'btn-row btn-row--wrap' }, calmBtn, calmLaunchers),
  );

  // Opcions de les eines (tots els mòduls menys l'agenda, que té la seva columna).
  // No hi ha una llista de pestanyes sempre visible: les opcions s'obren soles
  // quan una eina passa a la pantalla (clicant-la a dalt o amb la seva tecla).
  // Per preparar una eina sense mostrar-la, hi ha un selector discret.
  const toolModules = registry.all().filter((m) => m.id !== 'agenda');
  /** @type {{ id: string, panel: HTMLElement, showBtn: HTMLButtonElement | null }[]} */
  const tools = toolModules.map((mod) => {
    const body = h('div', { class: 'tool-panel__body' });
    const showBtn =
      mod.region === 'stage'
        ? button({
            label: t('stage.show'),
            icon: 'screen',
            onClick: () => core('setStage', { id: mod.id }),
          })
        : null;
    const titleId = `tool-title-${mod.id}`;
    const panel = h(
      'section',
      { class: 'tool-panel', 'aria-labelledby': titleId, hidden: true, dataset: { tool: mod.id } },
      h(
        'div',
        { class: 'tool-panel__head' },
        h('h3', { class: 'tool-panel__title', id: titleId }, icon(mod.icon), t(mod.nameKey)),
        h(
          'div',
          { class: 'btn-row' },
          showBtn,
          button({
            label: t('tools.close'),
            icon: 'close',
            iconOnly: true,
            variant: 'ghost',
            onClick: () => openTool(null),
          }),
        ),
      ),
      body,
    );
    controlViews.push({ view: mod.renderControl(body, deps.ctxFor(mod.id)) });
    return { id: mod.id, panel, showBtn };
  });
  const toolSelect = h(
    'select',
    { id: 'tool-select', class: 'input tool-picker__select' },
    h('option', { value: '' }, t('tools.none')),
    toolModules.map((mod) => h('option', { value: mod.id }, t(mod.nameKey))),
  );
  toolSelect.addEventListener('change', () => openTool(toolSelect.value || null));
  const toolArea = h(
    'div',
    { class: 'tool-area' },
    h(
      'div',
      { class: 'tool-picker' },
      h('label', { for: 'tool-select', class: 'tool-picker__label' }, t('tools.pick')),
      toolSelect,
    ),
    tools.map((tool) => tool.panel),
  );

  /** Eina amb les opcions obertes (null = cap). */
  /** @type {string | null} */
  let openToolId = null;
  /** @type {string | null} */
  let lastStage = null;
  /** @param {string | null} id */
  function openTool(id) {
    openToolId = tools.some((tool) => tool.id === id) ? id : null;
    for (const tool of tools) tool.panel.hidden = tool.id !== openToolId;
    toolSelect.value = openToolId ?? '';
  }

  const stagePane = h(
    'section',
    { class: 'pane pane--stage', 'aria-labelledby': 'stage-title' },
    h(
      'div',
      { class: 'pane__head' },
      h('h2', { class: 'pane__title', id: 'stage-title' }, icon('screen'), t('stage.title')),
      connection,
    ),
    previewWrap,
    stageSwitch,
    layoutControls.panel,
    toolArea,
  );

  const main = h('main', { id: 'main', class: 'workspace' }, agendaPane, stagePane);
  const skip = h('a', { href: '#main', class: 'skip-link' }, t('common.skipToContent'));
  // Peu: autoria, llicència i versió amb la compilació (així es veu si l'app
  // oberta és la darrera publicada). L'atribució d'ARASAAC és obligatòria.
  const year = APP_BUILD_DATE.slice(0, 4) || String(new Date().getFullYear());
  const footer = h(
    'footer',
    { class: 'app-footer' },
    h(
      'p',
      { class: 'app-footer__credits' },
      [
        `© ${year} ${AUTHOR}`,
        t('footer.role'),
        t('footer.code', { license: CODE_LICENSE }),
        h(
          'span',
          { title: APP_BUILD_DATE },
          t('footer.version', { version: APP_VERSION, build: APP_BUILD }),
        ),
      ].flatMap((part, i) => (i ? [h('span', { 'aria-hidden': 'true' }, '·'), part] : [part])),
    ),
    h('p', { class: 'attribution' }, t('attribution.arasaac')),
  );
  const app = h('div', { class: 'app' }, skip, topbar, banners, main, footer);
  root.replaceChildren(app);

  // --- Mode classe (una sola pantalla) --------------------------------------------
  /**
   * @type {{
   *   overlay: HTMLElement,
   *   view: ReturnType<typeof mountProjection>,
   *   controls: ReturnType<typeof createClassControls>,
   *   stopIdle: () => void,
   * } | null}
   */
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
    const controls = createClassControls({
      t,
      registry,
      dispatch,
      shortcuts: deps.shortcuts,
      getShared: deps.getShared,
      focusHome: () => overlay.focus(),
    });
    overlay.append(controls.el);
    document.body.append(overlay);
    app.inert = true;
    const view = mountProjection(screen, { registry, t, ctxFor: deps.viewCtxFor, mode: 'class' });
    view.update(deps.getShared());
    controls.update(deps.getShared());
    classMode = { overlay, view, controls, stopIdle: hideIdleCursor(overlay) };
    overlay.tabIndex = -1;
    overlay.focus();
    overlay.requestFullscreen?.().catch(() => {});
    setTimeout(() => hint.classList.add('is-faded'), 3000);
  }

  function exitClassMode() {
    if (!classMode) return;
    const { overlay, view, controls, stopIdle } = classMode;
    classMode = null;
    controls.destroy();
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
      for (const launcher of calmLaunchers) launcher.hidden = !state.live.calm;
      layoutControls.update(state);
      // Quan canvia el que es mostra, s'obren les opcions d'aquella eina
      // (l'agenda ja és a la columna de l'esquerra: llavors no se n'obre cap).
      if (state.live.stage !== lastStage) {
        lastStage = state.live.stage;
        openTool(state.live.stage);
      }
      for (const { id, showBtn } of tools) {
        if (!showBtn) continue;
        const showing = state.live.stage === id && !state.live.calm;
        showBtn.disabled = showing;
        showBtn
          .querySelector('.btn__label')
          ?.replaceChildren(showing ? t('stage.showing') : t('stage.show'));
      }
      previewView.update(state);
      classMode?.view.update(state);
      classMode?.controls.update(state);
      for (const { view } of controlViews) view.update(state);
    },
    /** @param {number} now */
    tick(now) {
      previewView.tick(now);
      classMode?.view.tick(now);
      for (const { view } of controlViews) view.tick?.(now);
    },
    /** @param {string} moduleId @param {unknown} value */
    transient(moduleId, value) {
      previewView.transient(moduleId, value);
      classMode?.view.transient(moduleId, value);
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
