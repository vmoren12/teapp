// @ts-check
// Editor de llistes d'elements amb pictograma i text (passos, vinyetes,
// opcions, estratègies…). Com l'agenda, les files es reaprofiten perquè el
// docent pugui escriure sense perdre el focus mentre la projecció s'actualitza.
// Reordenar es fa amb els botons «amunt/avall» (un sol clic o teclat).

import { h } from '../core/dom.js';
import { button, setButton } from './button.js';
import { icon } from './icons.js';
import { pictoElement } from './tea-picto.js';

/** @typedef {import('../modules/shared/items.js').Item} Item */
/** @typedef {import('../core/types.js').Translate} Translate */

/**
 * Controls addicionals d'una fila (p. ex. el tipus de frase d'una vinyeta).
 * @template {Item} T
 * @typedef {{ el: HTMLElement, update: (item: T) => void }} RowExtra
 */

/**
 * @template {Item} T
 * @param {{
 *   t: Translate,
 *   ui: import('../core/types.js').ControlUi | null,
 *   label: string,
 *   itemLabel: (n: number) => string,
 *   placeholder: string,
 *   untitled: string,
 *   maxLength?: number,
 *   onPatch: (id: string, patch: Partial<T>) => void,
 *   onMove: (id: string, delta: -1 | 1) => void,
 *   onRemove: (id: string) => void,
 *   extra?: (item: T) => RowExtra<T>,
 * }} options
 */
export function createItemListEditor({
  t,
  ui,
  label,
  itemLabel,
  placeholder,
  untitled,
  maxLength = 60,
  onPatch,
  onMove,
  onRemove,
  extra,
}) {
  const list = h('ol', { class: 'item-list', 'aria-label': label });
  /** @type {Map<string, ReturnType<typeof createRow>>} */
  const rows = new Map();

  /** @param {T} item */
  function createRow(item) {
    /** @type {T} */
    let current = item;
    let pictoKey = '?';
    const num = h('span', { class: 'item-row__num', 'aria-hidden': 'true' });
    const pictoBtn = h('button', { type: 'button', class: 'picto-btn' });
    const input = h('input', {
      type: 'text',
      class: 'input item-row__label',
      maxlength: maxLength,
      placeholder,
    });
    const upBtn = button({
      label: t('common.moveUp'),
      icon: 'up',
      variant: 'ghost',
      iconOnly: true,
    });
    const downBtn = button({
      label: t('common.moveDown'),
      icon: 'down',
      variant: 'ghost',
      iconOnly: true,
    });
    const delBtn = button({
      label: t('common.delete'),
      icon: 'trash',
      variant: 'ghost',
      iconOnly: true,
    });
    const more = extra?.(item);

    input.addEventListener('input', () =>
      onPatch(current.id, /** @type {Partial<T>} */ ({ label: input.value })),
    );
    pictoBtn.addEventListener('click', async () => {
      const ref = await ui?.pickPicto({ query: current.label });
      if (ref === undefined) return;
      const picto = ref ? { ...ref, alt: current.label || ref.alt } : null;
      // Si encara no hi ha text, fem servir el nom del pictograma.
      const patch = !current.label && ref?.alt ? { picto, label: ref.alt } : { picto };
      onPatch(current.id, /** @type {Partial<T>} */ (patch));
    });
    upBtn.addEventListener('click', () => onMove(current.id, -1));
    downBtn.addEventListener('click', () => onMove(current.id, 1));
    delBtn.addEventListener('click', () => {
      const sibling = li.nextElementSibling ?? li.previousElementSibling;
      onRemove(current.id);
      const target = sibling?.querySelector('.item-row__label');
      if (target instanceof HTMLElement) target.focus();
    });

    const li = h(
      'li',
      { class: 'item-row' },
      num,
      pictoBtn,
      h('div', { class: 'item-row__main' }, input, more?.el),
      h('div', { class: 'item-row__actions' }, upBtn, downBtn, delBtn),
    );

    return {
      el: li,
      focus: () => input.focus(),
      /** @param {T} next @param {number} i @param {number} count @param {string} [status] */
      update(next, i, count, status) {
        current = next;
        num.textContent = String(i + 1);
        if (status) li.dataset.status = status;
        else delete li.dataset.status;
        const name = next.label || untitled;
        input.setAttribute('aria-label', itemLabel(i + 1));
        if (document.activeElement !== input && input.value !== next.label)
          input.value = next.label;
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
          next.picto ? t('common.changePicto', { name }) : t('common.addPicto', { name }),
        );
        upBtn.disabled = i === 0;
        downBtn.disabled = i === count - 1;
        setButton(upBtn, { label: t('common.moveUpNamed', { name }) });
        setButton(downBtn, { label: t('common.moveDownNamed', { name }) });
        setButton(delBtn, { label: t('common.deleteNamed', { name }) });
        more?.update(next);
      },
    };
  }

  return {
    el: list,
    /** Posa el focus al text d'un element (p. ex. el que s'acaba d'afegir). @param {string} id */
    focus(id) {
      rows.get(id)?.focus();
    },
    /**
     * @param {T[]} items
     * @param {(index: number) => string | undefined} [statusOf]
     */
    update(items, statusOf) {
      const active = document.activeElement;
      const seen = new Set();
      items.forEach((item, i) => {
        let row = rows.get(item.id);
        if (!row) {
          row = createRow(item);
          rows.set(item.id, row);
        }
        row.update(item, i, items.length, statusOf?.(i));
        seen.add(item.id);
      });
      for (const [id, row] of rows) {
        if (!seen.has(id)) {
          row.el.remove();
          rows.delete(id);
        }
      }
      items.forEach((item, i) => {
        const el = /** @type {HTMLElement} */ (rows.get(item.id)?.el);
        if (list.children[i] !== el) list.insertBefore(el, list.children[i] ?? null);
      });
      if (
        active instanceof HTMLElement &&
        active.isConnected &&
        document.activeElement !== active
      ) {
        active.focus();
      }
    },
  };
}
