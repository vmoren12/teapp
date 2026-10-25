// @ts-check
// Diàlegs modals amb l'element natiu <dialog>: el navegador ja gestiona el
// focus atrapat, la tecla Esc i l'accessibilitat.

import { append, h } from '../core/dom.js';
import { button } from './button.js';

/** @typedef {import('../core/types.js').Translate} Translate */

let counter = 0;

/**
 * Obre un diàleg i retorna una promesa que es resol amb el valor de tancament.
 * @template T
 * @param {{
 *   t: Translate,
 *   title: string,
 *   body: (close: (value?: T) => void) => Node | Node[],
 *   className?: string,
 *   description?: string,
 * }} options
 * @returns {Promise<T | undefined>}
 */
export function openDialog({ t, title, body, className = '', description }) {
  return new Promise((resolve) => {
    const titleId = `dialog-title-${++counter}`;
    const descId = description ? `dialog-desc-${counter}` : null;
    const previous = document.activeElement;
    /** @type {T | undefined} */
    let result;

    const dialog = h('dialog', {
      class: `dialog ${className}`.trim(),
      'aria-labelledby': titleId,
      'aria-describedby': descId,
    });
    /** @param {T} [value] */
    const close = (value) => {
      result = value;
      dialog.close();
    };

    const content = body(close);
    append(dialog, [
      h(
        'header',
        { class: 'dialog__head' },
        h('h2', { id: titleId, class: 'dialog__title' }, title),
        button({
          label: t('common.close'),
          icon: 'close',
          variant: 'ghost',
          iconOnly: true,
          onClick: () => close(),
        }),
      ),
      descId ? h('p', { id: descId, class: 'dialog__desc' }, description) : null,
      h('div', { class: 'dialog__body' }, ...(Array.isArray(content) ? content : [content])),
    ]);

    dialog.addEventListener('close', () => {
      dialog.remove();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      resolve(result);
    });
    document.body.append(dialog);
    dialog.showModal();
    // El focus va al primer element marcat amb data-autofocus, si n'hi ha.
    const first = dialog.querySelector('[data-autofocus]');
    if (first instanceof HTMLElement) first.focus();
  });
}

/**
 * @param {{ t: Translate, title: string, message: string, confirmLabel: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export async function confirmDialog({ t, title, message, confirmLabel, danger = false }) {
  const value = await openDialog({
    t,
    title,
    className: 'dialog--small',
    body: (close) => [
      h('p', null, message),
      h(
        'div',
        { class: 'dialog__actions' },
        button({ label: t('common.cancel'), onClick: () => close(false) }),
        button({
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          attrs: { 'data-autofocus': true },
          onClick: () => close(true),
        }),
      ),
    ],
  });
  return value === true;
}

/**
 * @param {{ t: Translate, title: string, label: string, value?: string, confirmLabel: string }} options
 * @returns {Promise<string | null>}
 */
export async function promptDialog({ t, title, label, value = '', confirmLabel }) {
  const result = await openDialog({
    t,
    title,
    className: 'dialog--small',
    body: (close) => {
      const input = h('input', {
        type: 'text',
        class: 'input',
        value,
        maxlength: 80,
        required: true,
        'data-autofocus': true,
      });
      const form = h(
        'form',
        {
          class: 'stack',
          onSubmit: (/** @type {SubmitEvent} */ event) => {
            event.preventDefault();
            const text = input.value.trim();
            if (text) close(text);
          },
        },
        h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), input),
        h(
          'div',
          { class: 'dialog__actions' },
          button({ label: t('common.cancel'), onClick: () => close(undefined) }),
          h('button', { type: 'submit', class: 'btn btn--primary' }, confirmLabel),
        ),
      );
      return form;
    },
  });
  return typeof result === 'string' ? result : null;
}
