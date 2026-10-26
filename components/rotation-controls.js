// @ts-check
// Alternança de vistes (core/rotation.js):
//   - el panell complet, a «A la pantalla»: activar-la i triar quines vistes
//     s'alternen i quant de temps es mostra cadascuna (en segons o minuts);
//   - un selector ràpid de durada, per als menús del mode classe i de la projecció.

import { h } from '../core/dom.js';
import { durationMs, isRotating, liveRotation, ROTATION_PRESETS } from '../core/rotation.js';

/** @typedef {import('../core/rotation.js').RotationItem} RotationItem */

let counter = 0;

/** @param {import('../core/types.js').Translate} t @param {{ amount: number, unit: string }} d */
export const durationText = (t, d) => t(`rotation.short.${d.unit}`, { count: d.amount });

/**
 * Desplegable de durades ràpides. Si la vista té una durada que no és a la
 * llista (triada al panell), també hi surt.
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   label: string,
 *   onChange: (d: { amount: number, unit: 's' | 'min' }) => void,
 *   className?: string,
 * }} deps
 */
export function durationSelect({ t, label, onChange, className = '' }) {
  const select = h('select', { class: `input ${className}`, 'aria-label': label });
  select.addEventListener('change', () => {
    const [amount, unit] = select.value.split(':');
    onChange({ amount: Number(amount), unit: unit === 'min' ? 'min' : 's' });
  });
  let lastKey = '';
  return {
    el: select,
    /** @param {{ amount: number, unit: 's' | 'min' }} item */
    update(item) {
      const value = `${item.amount}:${item.unit}`;
      /** @type {{ amount: number, unit: 's' | 'min' }[]} */
      const list = [...ROTATION_PRESETS];
      if (!list.some((d) => d.amount === item.amount && d.unit === item.unit)) list.push(item);
      list.sort((a, b) => durationMs(a) - durationMs(b));
      const key = list.map((d) => `${d.amount}:${d.unit}`).join('|');
      if (key !== lastKey) {
        lastKey = key;
        select.replaceChildren(
          ...list.map((d) => h('option', { value: `${d.amount}:${d.unit}` }, durationText(t, d))),
        );
      }
      select.value = value;
    },
  };
}

/**
 * Secció «Alterna les vistes» del panell.
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   registry: import('../core/registry.js').Registry,
 *   core: (type: string, payload?: Record<string, unknown>) => void,
 * }} deps
 */
export function createRotationPanel({ t, registry, core }) {
  const prefix = `rotation-${++counter}`;
  const enabled = h('input', { type: 'checkbox', id: `${prefix}-on` });
  enabled.addEventListener('change', () =>
    core('setRotation', { patch: { enabled: enabled.checked } }),
  );
  const status = h('p', { class: 'field__hint', role: 'status' });

  const rows = registry.stage().map((mod) => {
    const id = `${prefix}-${mod.id}`;
    const name = t(mod.nameKey);
    const include = h('input', { type: 'checkbox', id });
    include.addEventListener('change', () =>
      core('setRotationItem', { id: mod.id, include: include.checked }),
    );
    const amount = h('input', {
      type: 'number',
      class: 'input input--number rotation-row__amount',
      min: 1,
      step: 1,
      inputmode: 'numeric',
      'aria-label': t('rotation.duration', { name }),
    });
    amount.addEventListener('change', () => {
      const value = Math.round(Number(amount.value));
      if (value >= 1) core('setRotationItem', { id: mod.id, include: true, amount: value });
    });
    const unit = h(
      'select',
      { class: 'input rotation-row__unit', 'aria-label': t('rotation.unit', { name }) },
      h('option', { value: 's' }, t('rotation.seconds')),
      h('option', { value: 'min' }, t('rotation.minutes')),
    );
    unit.addEventListener('change', () =>
      core('setRotationItem', { id: mod.id, include: true, unit: unit.value }),
    );
    return {
      id: mod.id,
      el: h(
        'li',
        { class: 'rotation-row' },
        h('div', { class: 'field field--check' }, include, h('label', { for: id }, name)),
        h('div', { class: 'rotation-row__duration' }, amount, unit),
      ),
      /** @param {RotationItem | undefined} item */
      update(item) {
        include.checked = item !== undefined;
        const shown = item ?? { amount: 30, unit: 's' };
        if (document.activeElement !== amount) amount.value = String(shown.amount);
        amount.max = shown.unit === 'min' ? '120' : '3600';
        unit.value = shown.unit;
      },
    };
  });

  const panel = h(
    'details',
    { class: 'pane__config rotation-controls' },
    h('summary', null, t('rotation.title')),
    h('p', { class: 'field__hint' }, t('rotation.hint')),
    h(
      'div',
      { class: 'field field--check' },
      enabled,
      h('label', { for: `${prefix}-on` }, t('rotation.enabled')),
    ),
    h(
      'fieldset',
      { class: 'field rotation-list' },
      h('legend', { class: 'field__label' }, t('rotation.views')),
      h(
        'ul',
        { class: 'rotation-rows' },
        rows.map((r) => r.el),
      ),
    ),
    status,
  );

  return {
    panel,
    /** @param {import('../core/types.js').SharedState} state */
    update(state) {
      const rotation = liveRotation(state.live);
      enabled.checked = rotation.enabled;
      for (const row of rows) row.update(rotation.items.find((i) => i.id === row.id));
      status.textContent = !rotation.enabled
        ? ''
        : isRotating(rotation)
          ? t('rotation.on', { count: rotation.items.length })
          : t('rotation.needTwo');
    },
  };
}
