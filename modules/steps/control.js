// @ts-check
// Panell de control de les instruccions pas a pas.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { createConfigForm } from '../../components/config-form.js';
import { createItemListEditor } from '../../components/item-list-editor.js';
import { createActivityScope } from '../../components/activity-scope.js';
import { activeSteps, listFor, MAX_STEPS } from './logic.js';

/** @typedef {import('./logic.js').StepsState} StepsState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderStepsControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;
  /** @returns {StepsState | undefined} */
  const steps = () => ctx.getState().live.modules.steps;

  const status = h('p', { class: 'callout' });
  const prevBtn = button({
    label: t('steps.prev'),
    icon: 'prev',
    onClick: () => dispatch({ type: 'prev' }),
  });
  const nextBtn = button({
    label: t('steps.next'),
    icon: 'next',
    variant: 'primary',
    onClick: () => dispatch({ type: 'next' }),
  });
  const restartBtn = button({
    label: t('steps.restart'),
    icon: 'reset',
    variant: 'ghost',
    onClick: () => dispatch({ type: 'restart' }),
  });

  const scope = createActivityScope({
    t,
    id: 'steps-scope',
    onChange: () => render(),
    onCreate: (key) => {
      dispatch({ type: 'createOwn', payload: { key } });
      ui?.announce(t('scope.created'));
    },
    onRemove: (key) => {
      dispatch({ type: 'removeOwn', payload: { key } });
      ui?.announce(t('scope.removed'));
    },
  });

  const editor = createItemListEditor({
    t,
    ui,
    label: t('steps.listLabel'),
    itemLabel: (n) => t('steps.itemLabel', { n }),
    placeholder: t('steps.placeholder'),
    untitled: t('steps.untitled'),
    maxLength: 80,
    onPatch: (id, patch) =>
      dispatch({ type: 'update', payload: { key: scope.editing(), id, patch } }),
    onMove: (id, delta) => dispatch({ type: 'move', payload: { key: scope.editing(), id, delta } }),
    onRemove: (id) => dispatch({ type: 'remove', payload: { key: scope.editing(), id } }),
  });
  const empty = h('p', { class: 'empty' }, t('steps.empty'));
  const addBtn = button({
    label: t('steps.add'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      const id = ui.newId();
      dispatch({
        type: 'add',
        payload: { key: scope.editing(), item: { id, label: '', picto: null } },
      });
      editor.focus(id);
    },
  });
  const editArea = h(
    'div',
    { class: 'stack' },
    editor.el,
    empty,
    h('div', { class: 'btn-row' }, addBtn),
  );

  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.steps ?? {},
    t,
    onChange: (patch) =>
      dispatch({ module: 'core', type: 'setModuleConfig', payload: { moduleId: 'steps', patch } }),
  });

  el.append(
    h('p', { class: 'muted' }, t('steps.help')),
    status,
    h('div', { class: 'btn-row btn-row--wrap' }, prevBtn, nextBtn, restartBtn),
    scope.el,
    editArea,
    h(
      'details',
      { class: 'pane__config' },
      h('summary', null, t('common.displayOptions')),
      configForm.el,
    ),
  );

  function render() {
    const state = ctx.getState();
    const s = steps();
    if (!s) return;
    const active = activeSteps(s, state.live);
    scope.update(state.live, Object.keys(s.byActivity), active.key);
    const key = scope.editing();
    const list = key ? listFor(s, key) : null;
    editArea.hidden = !list;
    if (list) {
      // A la llista que es veu ara, es marquen els passos fets i l'actual.
      const statusOf = (/** @type {number} */ i) =>
        key === active.key
          ? i < active.index
            ? 'done'
            : i === active.index
              ? 'now'
              : undefined
          : undefined;
      editor.update(list, statusOf);
      empty.hidden = list.length > 0;
      addBtn.disabled = list.length >= MAX_STEPS;
    }
    const count = active.steps.length;
    status.textContent =
      count === 0
        ? t('steps.statusEmpty')
        : active.index >= count
          ? t('steps.statusDone')
          : t('steps.status', { n: active.index + 1, count });
    prevBtn.disabled = active.index <= 0;
    nextBtn.disabled = active.index >= count;
    restartBtn.disabled = active.index === 0;
  }

  /** @type {unknown} */
  let lastSteps = null;
  /** @type {unknown} */
  let lastAgenda = null;
  return {
    update(state) {
      configForm.update(state.live.config.steps ?? {});
      const s = state.live.modules.steps;
      const agenda = state.live.modules.agenda;
      if (s === lastSteps && agenda === lastAgenda) return;
      lastSteps = s;
      lastAgenda = agenda;
      render();
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
