// @ts-check
// Panell de control dels avisos de transició.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { createConfigForm } from '../../components/config-form.js';
import { getAgenda } from '../agenda/selectors.js';
import { computeWarning } from './logic.js';

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderTransitionsControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;
  const status = h('p', { class: 'callout' });
  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.transitions ?? {},
    t,
    onChange: (patch) =>
      dispatch({
        module: 'core',
        type: 'setModuleConfig',
        payload: { moduleId: 'transitions', patch },
      }),
  });

  el.append(
    h('p', { class: 'muted' }, t('transitions.help')),
    status,
    configForm.el,
    h(
      'div',
      { class: 'btn-row' },
      button({
        label: t('transitions.testSound'),
        icon: 'sound',
        onClick: () => ui?.playSound('warning'),
      }),
    ),
  );

  let lastText = '';
  /** @param {number} now */
  function tick(now) {
    const state = ctx.getState();
    const warning = computeWarning(getAgenda(state.live), state.live.config.transitions ?? {}, now);
    const text = !warning
      ? t('transitions.none')
      : warning.kind === 'due'
        ? t('transitions.due')
        : t('transitions.left', { count: warning.left });
    if (text !== lastText) {
      lastText = text;
      status.textContent = `${t('transitions.statusLabel')}: ${text}`;
    }
  }

  return {
    update(state) {
      configForm.update(state.live.config.transitions ?? {});
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
