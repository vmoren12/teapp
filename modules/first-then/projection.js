// @ts-check
// Tauler Primer → Després a la projecció: dues caselles grans.
// Decisió pedagògica: quan la primera tasca està feta es marca amb un signe
// de verificació i la casella «Després» passa a destacar; així es veu el
// progrés sense canviar de pantalla.

import { h } from '../../core/dom.js';
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
export function renderFirstThenProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-ft');

  /** @param {'first' | 'then'} slot */
  const panel = (slot) => {
    const picto = h('div', { class: 'pj-ft__picto' });
    const label = h('p', { class: 'pj-ft__label' });
    const check = h(
      'span',
      { class: 'pj-ft__check', hidden: true },
      icon('check'),
      t('status.done'),
    );
    const section = h(
      'section',
      { class: `pj-ft__card pj-ft__card--${slot}` },
      h(
        'h2',
        { class: 'pj-ft__title' },
        t(slot === 'first' ? 'firstThen.first' : 'firstThen.then'),
      ),
      picto,
      label,
      check,
    );
    let key = '';
    return {
      section,
      /** @param {Card} card @param {boolean} done */
      update(card, done) {
        const nextKey = JSON.stringify([card.label, card.picto?.source, card.picto?.id]);
        if (nextKey !== key) {
          key = nextKey;
          picto.replaceChildren(card.picto ? pictoElement(card.picto, { decorative: true }) : '');
          label.textContent = card.label;
        }
        section.dataset.empty = String(!card.label && !card.picto);
        check.hidden = !done;
        section.dataset.done = String(done);
      },
    };
  };

  const first = panel('first');
  const then = panel('then');
  el.append(
    first.section,
    h('div', { class: 'pj-ft__arrow', 'aria-hidden': 'true' }, icon('arrow')),
    then.section,
  );

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
      // Si segueix l'agenda, mostra l'activitat actual i la següent.
      const board = boardOf(s, state.live);
      first.update(board.first, board.firstDone);
      then.update(board.then, false);
      el.dataset.done = String(board.firstDone);
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
