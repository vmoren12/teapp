// @ts-check
// Panell de control dels torns previsibles.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { createConfigForm } from '../../components/config-form.js';
import {
  COLORS,
  KINDS,
  MAX_COUNT,
  MAX_NAMES,
  MIN_COUNT,
  nowAndNext,
  participantCount,
  randomOrder,
} from './logic.js';
import { participantLabel } from './labels.js';

/** @typedef {import('./logic.js').TurnsState} TurnsState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderTurnsControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;
  /** @returns {TurnsState | undefined} */
  const turns = () => ctx.getState().live.modules.turns;

  // --- Qui participa ---------------------------------------------------------------
  const kindInputs = KINDS.map((kind) => {
    const input = h('input', { type: 'radio', name: 'turns-kind', value: kind });
    input.addEventListener(
      'change',
      () => input.checked && dispatch({ type: 'setKind', payload: { kind } }),
    );
    return { kind, input };
  });
  const kindField = h(
    'fieldset',
    { class: 'field segmented' },
    h('legend', { class: 'field__label' }, t('turns.kind')),
    h(
      'div',
      { class: 'segmented__options' },
      kindInputs.map(({ kind, input }) =>
        h(
          'label',
          { class: 'segmented__option' },
          input,
          h('span', null, t(`turns.kinds.${kind}`)),
        ),
      ),
    ),
  );

  const names = h('textarea', {
    id: 'turns-names',
    class: 'input turns-names',
    rows: 6,
    'aria-describedby': 'turns-names-hint',
    placeholder: t('turns.namesPlaceholder'),
  });
  names.addEventListener('input', () =>
    dispatch({ type: 'setNames', payload: { names: names.value.split('\n') } }),
  );
  const namesField = h(
    'div',
    { class: 'field' },
    h('label', { for: 'turns-names', class: 'field__label' }, t('turns.names')),
    names,
    h(
      'p',
      { class: 'field__hint', id: 'turns-names-hint' },
      t('turns.namesHint', { max: MAX_NAMES }),
    ),
  );

  const count = h('input', {
    type: 'number',
    id: 'turns-count',
    class: 'input input--number',
    min: MIN_COUNT,
    max: MAX_COUNT,
    step: 1,
    inputmode: 'numeric',
  });
  count.addEventListener('change', () => {
    const n = Number(count.value);
    if (Number.isInteger(n)) dispatch({ type: 'setCount', payload: { count: n } });
  });
  const countField = h(
    'div',
    { class: 'field' },
    h('label', { for: 'turns-count', class: 'field__label' }, t('turns.count')),
    count,
  );

  // --- Ordre i torns -----------------------------------------------------------------
  const current = h('p', { class: 'callout turns-current' });
  const prevBtn = button({
    label: t('turns.prev'),
    icon: 'prev',
    onClick: () => dispatch({ type: 'prev' }),
  });
  const nextBtn = button({
    label: t('turns.next'),
    icon: 'next',
    variant: 'primary',
    onClick: () => dispatch({ type: 'next' }),
  });
  const shuffleBtn = button({
    label: t('turns.shuffle'),
    icon: 'shuffle',
    onClick: () => {
      const s = turns();
      if (!s) return;
      dispatch({ type: 'shuffle', payload: { order: randomOrder(s.order.length) } });
      ui?.announce(t('turns.shuffled'));
    },
  });
  const listBtn = button({
    label: t('turns.listOrder'),
    icon: 'list',
    variant: 'ghost',
    onClick: () => dispatch({ type: 'listOrder' }),
  });
  const orderList = h('ol', { class: 'turns-order', 'aria-label': t('turns.orderLabel') });

  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.turns ?? {},
    t,
    onChange: (patch) =>
      dispatch({ module: 'core', type: 'setModuleConfig', payload: { moduleId: 'turns', patch } }),
  });

  el.append(
    h('p', { class: 'muted' }, t('turns.help')),
    h('p', { class: 'callout' }, t('turns.privacy')),
    kindField,
    namesField,
    countField,
    current,
    h('div', { class: 'btn-row btn-row--wrap' }, prevBtn, nextBtn, shuffleBtn, listBtn),
    h('p', { class: 'muted' }, t('turns.shuffleHelp')),
    orderList,
    h(
      'details',
      { class: 'pane__config' },
      h('summary', null, t('common.displayOptions')),
      configForm.el,
    ),
  );

  /** @type {unknown} */
  let last = null;
  return {
    update(state) {
      configForm.update(state.live.config.turns ?? {});
      /** @type {TurnsState | undefined} */
      const s = state.live.modules.turns;
      if (!s || s === last) return;
      last = s;
      for (const { kind, input } of kindInputs) input.checked = s.kind === kind;
      namesField.hidden = s.kind !== 'names';
      countField.hidden = s.kind === 'names';
      count.max = String(s.kind === 'colors' ? COLORS.length : MAX_COUNT);
      if (document.activeElement !== count) count.value = String(participantCount(s));
      // Mentre s'escriu no es reescriu el text (les línies buides es conserven).
      if (document.activeElement !== names) names.value = s.names.join('\n');

      const { now, next } = nowAndNext(s);
      const total = s.order.length;
      current.textContent =
        now === null
          ? t('turns.noneYet')
          : t('turns.currentStatus', {
              now: participantLabel(s, now, t),
              next: next === null ? '—' : participantLabel(s, next, t),
            });
      prevBtn.disabled = total < 2;
      nextBtn.disabled = total < 2;
      shuffleBtn.disabled = total < 2;
      listBtn.hidden = s.mode !== 'random';
      orderList.replaceChildren(
        ...s.order.map((index, pos) =>
          h(
            'li',
            { dataset: { current: String(pos === s.position) } },
            button({
              label: participantLabel(s, index, t),
              variant: 'ghost',
              attrs: {
                'aria-current': pos === s.position ? 'true' : null,
                'aria-label': t('turns.goTo', { name: participantLabel(s, index, t) }),
              },
              onClick: () => dispatch({ type: 'goTo', payload: { position: pos } }),
            }),
          ),
        ),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
