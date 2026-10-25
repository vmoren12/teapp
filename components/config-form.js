// @ts-check
// Formulari generat automàticament a partir de l'esquema de configuració d'un
// mòdul. Així cada mòdul nou té la seva configuració sense escriure interfície.

import { h } from '../core/dom.js';

/** @typedef {import('../core/types.js').ConfigField} ConfigField */
/** @typedef {import('../core/types.js').Translate} Translate */

let counter = 0;

/**
 * @param {{
 *   schema: ConfigField[],
 *   values: Record<string, unknown>,
 *   t: Translate,
 *   onChange: (patch: Record<string, unknown>) => void,
 * }} options
 */
export function createConfigForm({ schema, values, t, onChange }) {
  const prefix = `cfg-${++counter}`;
  /** @type {((values: Record<string, unknown>) => void)[]} */
  const updaters = [];
  const form = h('div', { class: 'config-form' });

  for (const field of schema) {
    const id = `${prefix}-${field.key}`;
    const hint = field.hintKey
      ? h('p', { class: 'field__hint', id: `${id}-hint` }, t(field.hintKey))
      : null;
    const describedBy = hint ? `${id}-hint` : null;

    if (field.type === 'boolean') {
      const input = h('input', { type: 'checkbox', id, 'aria-describedby': describedBy });
      input.addEventListener('change', () => onChange({ [field.key]: input.checked }));
      updaters.push((v) => {
        input.checked = v[field.key] === true;
      });
      form.append(
        h(
          'div',
          { class: 'field field--check' },
          input,
          h('label', { for: id }, t(field.labelKey)),
          hint,
        ),
      );
    } else if (field.type === 'select') {
      // Poques opcions: botons de ràdio, que es veuen totes d'una ullada.
      const options = field.options ?? [];
      const inputs = options.map((opt) => {
        const input = h('input', { type: 'radio', name: id, value: String(opt.value) });
        input.addEventListener('change', () => {
          if (input.checked) onChange({ [field.key]: opt.value });
        });
        return { input, opt };
      });
      updaters.push((v) => {
        for (const { input, opt } of inputs) input.checked = v[field.key] === opt.value;
      });
      form.append(
        h(
          'fieldset',
          { class: 'field segmented', 'aria-describedby': describedBy },
          h('legend', { class: 'field__label' }, t(field.labelKey)),
          h(
            'div',
            { class: 'segmented__options' },
            inputs.map(({ input, opt }) =>
              h('label', { class: 'segmented__option' }, input, h('span', null, t(opt.labelKey))),
            ),
          ),
          hint,
        ),
      );
    } else if (field.type === 'numbers') {
      const options = field.options ?? [];
      const inputs = options.map((opt) => {
        const input = h('input', { type: 'checkbox', value: String(opt.value) });
        input.addEventListener('change', () => {
          const selected = inputs.filter((i) => i.input.checked).map((i) => i.opt.value);
          onChange({ [field.key]: selected });
        });
        return { input, opt };
      });
      updaters.push((v) => {
        const list = Array.isArray(v[field.key]) ? /** @type {unknown[]} */ (v[field.key]) : [];
        for (const { input, opt } of inputs) input.checked = list.includes(opt.value);
      });
      form.append(
        h(
          'fieldset',
          { class: 'field segmented', 'aria-describedby': describedBy },
          h('legend', { class: 'field__label' }, t(field.labelKey)),
          h(
            'div',
            { class: 'segmented__options' },
            inputs.map(({ input, opt }) =>
              h('label', { class: 'segmented__option' }, input, h('span', null, t(opt.labelKey))),
            ),
          ),
          hint,
        ),
      );
    } else if (field.type === 'number') {
      const input = h('input', {
        type: 'number',
        id,
        class: 'input input--number',
        min: field.min,
        max: field.max,
        'aria-describedby': describedBy,
      });
      input.addEventListener('change', () => {
        const n = Number(input.value);
        if (input.value !== '' && Number.isFinite(n)) onChange({ [field.key]: n });
      });
      updaters.push((v) => {
        if (document.activeElement !== input) input.value = String(v[field.key] ?? '');
      });
      form.append(
        h(
          'div',
          { class: 'field' },
          h('label', { for: id, class: 'field__label' }, t(field.labelKey)),
          input,
          hint,
        ),
      );
    }
  }

  /** @param {Record<string, unknown>} next */
  const update = (next) => updaters.forEach((fn) => fn(next));
  update(values);
  return { el: form, update };
}
