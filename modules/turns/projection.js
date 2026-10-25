// @ts-check
// Torns a la projecció: qui té el torn ara i qui el té després, i l'ordre
// sencer a sota (fix i visible). Decisió pedagògica: saber quan arriba el torn
// propi redueix l'ansietat d'espera i les interrupcions.
// Mai no es mostren comptadors, puntuacions ni comparacions. Amb «amaga els
// noms», només es veu el número de torn.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { COLORS, nowAndNext } from './logic.js';
import { participantLabel } from './labels.js';

/** @typedef {import('./logic.js').TurnsState} TurnsState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderTurnsProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-turns');

  /** @param {'now' | 'next'} slot */
  const panel = (slot) => {
    const body = h('div', { class: 'pj-turns__who' });
    const section = h(
      'section',
      { class: `pj-turns__card pj-turns__card--${slot}` },
      h('h2', { class: 'pj-turns__title' }, t(slot === 'now' ? 'turns.now' : 'turns.after')),
      body,
    );
    return { section, body };
  };
  const now = panel('now');
  const next = panel('next');
  const order = h('ol', { class: 'pj-turns__order', 'aria-label': t('turns.orderLabel') });
  const announce = h('p', { class: 'pj-turns__announce' });
  const empty = h('p', { class: 'pj-message' }, t('turns.projectionEmpty'));
  el.append(
    h(
      'div',
      { class: 'pj-turns__pair' },
      now.section,
      h('div', { class: 'pj-turns__arrow', 'aria-hidden': 'true' }, icon('arrow')),
      next.section,
    ),
    announce,
    order,
    empty,
  );

  /**
   * Contingut d'un participant: el nom o número, i una mostra de color si cal.
   * @param {TurnsState} s @param {number} index @param {boolean} hide @param {number} pos
   * @returns {HTMLElement[]}
   */
  const who = (s, index, hide, pos) => {
    if (hide)
      return [h('span', { class: 'pj-turns__label' }, t('turns.turnNumber', { n: pos + 1 }))];
    const label = h('span', { class: 'pj-turns__label' }, participantLabel(s, index, t));
    if (s.kind !== 'colors') return [label];
    return [
      h('span', {
        class: 'pj-turns__swatch',
        dataset: { color: COLORS[index] },
        'aria-hidden': 'true',
      }),
      label,
    ];
  };

  let lastKey = '';
  return {
    update(state) {
      /** @type {TurnsState | undefined} */
      const s = state.live.modules.turns;
      if (!s) return;
      const config = state.live.config.turns ?? {};
      const hide = config.hideNames === true;
      const showOrder = config.showOrder !== false;
      const key = JSON.stringify([s, hide, showOrder]);
      if (key === lastKey) return;
      lastKey = key;

      const total = s.order.length;
      empty.hidden = total > 0;
      el.dataset.empty = String(total === 0);
      const { now: nowIndex, next: nextIndex } = nowAndNext(s);
      now.body.replaceChildren(...(nowIndex === null ? [] : who(s, nowIndex, hide, s.position)));
      next.body.replaceChildren(
        ...(nextIndex === null ? ['—'] : who(s, nextIndex, hide, (s.position + 1) % total)),
      );
      // L'ordre aleatori s'anuncia: es diu i es veu sencer abans de començar.
      announce.textContent = s.mode === 'random' ? t('turns.randomAnnounced') : '';
      announce.hidden = s.mode !== 'random';
      order.hidden = !showOrder || total === 0;
      order.replaceChildren(
        ...s.order.map((index, pos) =>
          h(
            'li',
            {
              class: 'pj-turns__chip',
              dataset: {
                status:
                  pos === s.position ? 'now' : pos === (s.position + 1) % total ? 'next' : 'later',
              },
            },
            ...who(s, index, hide, pos),
          ),
        ),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
