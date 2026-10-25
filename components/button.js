// @ts-check
import { h, srOnly } from '../core/dom.js';
import { icon } from './icons.js';

/**
 * @typedef {Object} ButtonOptions
 * @property {string} label
 * @property {string} [icon]
 * @property {'default' | 'primary' | 'ghost' | 'danger' | 'quiet'} [variant]
 * @property {boolean} [iconOnly]   Mostra només la icona (el text queda per a lectors de pantalla).
 * @property {string} [className]
 * @property {string} [kbd]         Tecla de drecera que es mostra al botó.
 * @property {(event: MouseEvent) => void} [onClick]
 * @property {Record<string, any>} [attrs]
 */

/** @param {ButtonOptions} options */
export function button({
  label,
  icon: iconName,
  variant = 'default',
  iconOnly = false,
  className = '',
  kbd,
  onClick,
  attrs = {},
}) {
  const classes = ['btn', `btn--${variant}`, iconOnly && 'btn--icon', className]
    .filter(Boolean)
    .join(' ');
  return h(
    'button',
    { type: 'button', class: classes, title: iconOnly ? label : null, ...attrs, onClick },
    iconName && icon(iconName),
    iconOnly ? srOnly(label) : h('span', { class: 'btn__label' }, label),
    kbd && !iconOnly && h('kbd', { class: 'btn__kbd', 'aria-hidden': 'true' }, kbd),
  );
}

/**
 * Canvia el text i la icona d'un botó creat amb button().
 * @param {HTMLButtonElement} el
 * @param {{ label: string, icon?: string }} options
 */
export function setButton(el, { label, icon: iconName }) {
  const labelEl = el.querySelector('.btn__label, .sr-only');
  if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
  if (el.title) el.title = label;
  if (iconName && el.dataset.icon !== iconName) {
    el.dataset.icon = iconName;
    el.querySelector('svg')?.replaceWith(icon(iconName));
  }
}
