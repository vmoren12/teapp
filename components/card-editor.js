// @ts-check
// Editor d'una casella amb pictograma i text curt (expectatives, títols…).
// Conserva el focus mentre s'escriu i la projecció s'actualitza.

import { h } from '../core/dom.js';
import { icon } from './icons.js';
import { pictoElement } from './tea-picto.js';

/** @typedef {{ label: string, picto: import('../core/types.js').PictoRef | null }} Card */

let counter = 0;

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   ui: import('../core/types.js').ControlUi | null,
 *   title: string,
 *   placeholder: string,
 *   maxLength?: number,
 *   onChange: (patch: Partial<Card>) => void,
 * }} options
 */
export function createCardEditor({ t, ui, title, placeholder, maxLength = 60, onChange }) {
  const id = `card-editor-${++counter}`;
  const pictoBtn = h('button', { type: 'button', class: 'picto-btn picto-btn--large' });
  const input = h('input', { type: 'text', id, class: 'input', maxlength: maxLength, placeholder });
  /** @type {Card} */
  let card = { label: '', picto: null };
  let pictoKey = '?';

  input.addEventListener('input', () => onChange({ label: input.value }));
  pictoBtn.addEventListener('click', async () => {
    const ref = await ui?.pickPicto({ query: card.label });
    if (ref === undefined) return;
    const picto = ref ? { ...ref, alt: card.label || ref.alt } : null;
    onChange(!card.label && ref?.alt ? { picto, label: ref.alt } : { picto });
  });

  const el = h(
    'div',
    { class: 'card-editor' },
    h('label', { for: id, class: 'card-editor__title' }, title),
    h('div', { class: 'card-editor__row' }, pictoBtn, input),
  );

  return {
    el,
    /** Espai per afegir controls a sota (p. ex. «enllaça amb el temporitzador»). */
    extra: (/** @type {HTMLElement} */ node) => el.append(node),
    /** @param {Card} next */
    update(next) {
      card = next;
      if (document.activeElement !== input && input.value !== next.label) input.value = next.label;
      const key = next.picto ? `${next.picto.source}:${next.picto.id}` : '';
      if (key !== pictoKey) {
        pictoKey = key;
        pictoBtn.replaceChildren(
          next.picto ? pictoElement(next.picto, { decorative: true }) : icon('image'),
        );
        pictoBtn.classList.toggle('picto-btn--empty', !next.picto);
      }
      pictoBtn.setAttribute(
        'aria-label',
        t(next.picto ? 'common.changePicto' : 'common.addPicto', { name: title }),
      );
    },
  };
}
