// @ts-check
// Tauler d'elecció a la projecció: les opcions en una graella, amb el mateix
// pes. Si el grup ja ha triat, l'opció triada es destaca (vora, signe de
// verificació i l'etiqueta «Triat») i les altres queden visibles però apagades.
// Decisió pedagògica: oferir opcions acotades afavoreix l'autonomia i redueix
// la resistència.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { isReady } from './logic.js';

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderChoiceProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-choice');
  const title = h('h2', { class: 'pj-choice__title' });
  const grid = h('ul', { class: 'pj-choice__grid' });
  const empty = h('p', { class: 'pj-message' }, t('choice.projectionEmpty'));
  el.append(title, grid, empty);

  let lastKey = '';
  return {
    update(state) {
      /** @type {import('./logic.js').ChoiceState | undefined} */
      const s = state.live.modules.choice;
      if (!s) return;
      const key = JSON.stringify(s);
      if (key === lastKey) return;
      lastKey = key;
      const ready = isReady(s);
      empty.hidden = ready;
      grid.hidden = !ready;
      title.hidden = !ready || !s.title;
      title.textContent = s.title;
      el.dataset.chosen = String(s.chosenId !== null);
      grid.dataset.count = String(s.options.length);
      grid.replaceChildren(
        ...s.options.map((option) => {
          const chosen = option.id === s.chosenId;
          return h(
            'li',
            { class: 'pj-choice__option', dataset: { chosen: String(chosen) } },
            chosen
              ? h('span', { class: 'pj-badge pj-choice__badge' }, icon('check'), t('choice.chosen'))
              : null,
            h(
              'div',
              { class: 'pj-choice__picto' },
              option.picto ? pictoElement(option.picto, { decorative: true }) : null,
            ),
            h('p', { class: 'pj-choice__label' }, option.label),
          );
        }),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
