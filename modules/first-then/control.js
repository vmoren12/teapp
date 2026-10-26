// @ts-check
// Panell de control del tauler Primer → Després. Tot s'edita en directe.

import { h } from '../../core/dom.js';
import { button, setButton } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { boardOf } from './logic.js';

/** @typedef {import('./logic.js').FirstThenState} FirstThenState */
/** @typedef {import('./logic.js').Card} Card */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderFirstThenControl(el, ctx) {
  const { t, dispatch, ui } = ctx;

  /** @param {'first' | 'then'} slot */
  const editor = (slot) => {
    const title = t(slot === 'first' ? 'firstThen.first' : 'firstThen.then');
    const inputId = `ft-${slot}-label`;
    const pictoBtn = h('button', { type: 'button', class: 'picto-btn picto-btn--large' });
    const input = h('input', {
      type: 'text',
      id: inputId,
      class: 'input',
      maxlength: 60,
      placeholder: t('firstThen.placeholder'),
    });
    /** @type {Card} */
    let card = { label: '', picto: null };
    let pictoKey = '?';

    input.addEventListener('input', () =>
      dispatch({ type: 'setCard', payload: { slot, patch: { label: input.value } } }),
    );
    pictoBtn.addEventListener('click', async () => {
      const ref = await ui?.pickPicto({ query: card.label });
      if (ref === undefined) return;
      const picto = ref ? { ...ref, alt: card.label || ref.alt } : null;
      // Si encara no hi ha text, fem servir el nom del pictograma.
      const patch = !card.label && ref?.alt ? { picto, label: ref.alt } : { picto };
      dispatch({ type: 'setCard', payload: { slot, patch } });
    });

    return {
      el: h(
        'div',
        { class: `ft-editor ft-editor--${slot}` },
        h('h3', { class: 'ft-editor__title' }, title),
        pictoBtn,
        h('label', { for: inputId, class: 'sr-only' }, t('firstThen.labelFor', { slot: title })),
        input,
      ),
      /** @param {Card} next */
      update(next) {
        card = next;
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
          t(next.picto ? 'firstThen.changePicto' : 'firstThen.addPicto', { slot: title }),
        );
      },
    };
  };

  const first = editor('first');
  const then = editor('then');

  const doneBtn = button({
    label: t('firstThen.markDone'),
    icon: 'check',
    variant: 'primary',
    onClick: () => dispatch({ type: 'setDone', payload: { done: !board?.firstDone } }),
  });
  // Seguint l'agenda, «Avança» passa a l'activitat següent de l'agenda i el
  // tauler canvia sol; si no, «Després» passa a «Primer».
  const advanceBtn = button({
    label: t('firstThen.advance'),
    icon: 'next',
    onClick: () =>
      board?.follow ? dispatch({ module: 'agenda', type: 'next' }) : dispatch({ type: 'advance' }),
  });
  const swapBtn = button({
    label: t('firstThen.swap'),
    icon: 'swap',
    onClick: () => dispatch({ type: 'swap' }),
  });
  const followBtn = button({
    label: t('firstThen.follow'),
    icon: 'list',
    className: 'ft-follow',
    onClick: () => dispatch({ type: 'setFollow', payload: { follow: !board?.follow } }),
  });
  const clearBtn = button({
    label: t('firstThen.clear'),
    icon: 'trash',
    variant: 'ghost',
    onClick: () => dispatch({ type: 'clear' }),
  });
  const hint = h('p', { class: 'field__hint' });

  el.append(
    h(
      'div',
      { class: 'ft-editors' },
      first.el,
      h('div', { class: 'ft-editors__arrow', 'aria-hidden': 'true' }, icon('arrow')),
      then.el,
    ),
    hint,
    h('div', { class: 'btn-row btn-row--wrap' }, doneBtn, advanceBtn, swapBtn, followBtn, clearBtn),
  );

  /** @type {import('./logic.js').Board | null} */
  let board = null;
  /** @type {FirstThenState | null} */
  let last = null;
  /** @type {unknown} */
  let lastAgenda = null;
  return {
    update(state) {
      const s = state.live.modules.firstThen;
      const agenda = state.live.modules.agenda;
      if (!s || (s === last && agenda === lastAgenda)) return;
      last = s;
      lastAgenda = agenda;
      board = boardOf(s, state.live);
      first.update(board.first);
      then.update(board.then);
      doneBtn.setAttribute('aria-pressed', String(board.firstDone));
      setButton(doneBtn, {
        label: board.firstDone ? t('firstThen.markNotDone') : t('firstThen.markDone'),
      });
      followBtn.setAttribute('aria-pressed', String(board.follow));
      hint.textContent = t(board.follow ? 'firstThen.followingHint' : 'firstThen.manualHint');
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
