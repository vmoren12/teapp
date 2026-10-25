// @ts-check
// Panell de control del tauler d'elecció.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { createItemListEditor } from '../../components/item-list-editor.js';
import { EXAMPLE_SETS, isReady, MAX_OPTIONS, MIN_OPTIONS } from './logic.js';

/** @typedef {import('./logic.js').ChoiceState} ChoiceState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderChoiceControl(el, ctx) {
  const { t, dispatch, ui } = ctx;

  const title = h('input', {
    type: 'text',
    id: 'choice-title',
    class: 'input',
    maxlength: 60,
    placeholder: t('choice.titlePlaceholder'),
  });
  title.addEventListener('input', () =>
    dispatch({ type: 'setTitle', payload: { title: title.value } }),
  );

  const examples = h(
    'select',
    { id: 'choice-example', class: 'input' },
    Object.keys(EXAMPLE_SETS).map((key) =>
      h('option', { value: key }, t(`choice.examples.${key}.name`)),
    ),
  );
  const exampleBtn = button({
    label: t('choice.useExample'),
    icon: 'templates',
    onClick: () => {
      if (!ui) return;
      const key = examples.value;
      dispatch({
        type: 'setOptions',
        payload: {
          title: t(`choice.examples.${key}.title`),
          options: (EXAMPLE_SETS[key] ?? []).map(([textKey, pictoKey]) => {
            const label = t(`choice.options.${textKey}`);
            const id = ctx.pictos.starterId(pictoKey);
            return {
              id: ui.newId(),
              label,
              picto: id ? { source: 'arasaac', id, alt: label } : null,
            };
          }),
        },
      });
      ui.announce(t('choice.exampleApplied'));
    },
  });

  const editor = createItemListEditor({
    t,
    ui,
    label: t('choice.optionsLabel'),
    itemLabel: (n) => t('choice.optionLabel', { n }),
    placeholder: t('choice.optionPlaceholder'),
    untitled: t('choice.optionUntitled'),
    maxLength: 40,
    onPatch: (id, patch) => dispatch({ type: 'update', payload: { id, patch } }),
    onMove: (id, delta) => dispatch({ type: 'move', payload: { id, delta } }),
    onRemove: (id) => dispatch({ type: 'remove', payload: { id } }),
  });
  const addBtn = button({
    label: t('choice.add'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      const id = ui.newId();
      dispatch({ type: 'add', payload: { item: { id, label: '', picto: null } } });
      editor.focus(id);
    },
  });
  const minNote = h(
    'p',
    { class: 'field__hint' },
    t('choice.minNote', { min: MIN_OPTIONS, max: MAX_OPTIONS }),
  );

  // Marcar l'opció triada pel grup (o cap: el tauler queda com a referència).
  const chooseGroup = h('div', {
    class: 'btn-row btn-row--wrap',
    role: 'group',
    'aria-labelledby': 'choice-choose',
  });
  const noneBtn = button({
    label: t('choice.none'),
    variant: 'ghost',
    onClick: () => dispatch({ type: 'choose', payload: { id: null } }),
  });

  el.append(
    h('p', { class: 'muted' }, t('choice.help')),
    h('p', { class: 'callout' }, t('choice.privacy')),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'choice-title', class: 'field__label' }, t('choice.title')),
      title,
    ),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'choice-example', class: 'field__label' }, t('choice.examplesLabel')),
      h('div', { class: 'inline-form' }, examples, exampleBtn),
    ),
    editor.el,
    minNote,
    h('div', { class: 'btn-row' }, addBtn),
    h('p', { class: 'field__label', id: 'choice-choose' }, t('choice.chooseLabel')),
    chooseGroup,
  );

  /** @type {unknown} */
  let last = null;
  return {
    update(state) {
      /** @type {ChoiceState | undefined} */
      const s = state.live.modules.choice;
      if (!s || s === last) return;
      last = s;
      if (document.activeElement !== title && title.value !== s.title) title.value = s.title;
      editor.update(s.options, (i) => (s.options[i].id === s.chosenId ? 'now' : undefined));
      addBtn.disabled = s.options.length >= MAX_OPTIONS;
      minNote.dataset.warn = String(!isReady(s));
      chooseGroup.replaceChildren(
        ...s.options.map((option) =>
          button({
            label: option.label || t('choice.optionUntitled'),
            icon: s.chosenId === option.id ? 'check' : undefined,
            className: 'btn--chip',
            attrs: {
              'aria-pressed': String(s.chosenId === option.id),
              'aria-label': t('choice.chooseNamed', {
                name: option.label || t('choice.optionUntitled'),
              }),
            },
            onClick: () => dispatch({ type: 'choose', payload: { id: option.id } }),
          }),
        ),
        noneBtn,
      );
      noneBtn.setAttribute('aria-pressed', String(s.chosenId === null));
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
