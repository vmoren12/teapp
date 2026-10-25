// @ts-check
// Instruccions a la projecció: un sol pas gran amb «Pas 2 de 5», o bé la
// llista sencera amb el pas actual destacat.
// Decisió pedagògica: dividir la tasca en passos visibles redueix la càrrega de
// memòria de treball i les preguntes repetides. Els passos fets es marquen
// (signe de verificació) però no desapareixen: el progrés dona seguretat.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { activeSteps } from './logic.js';

/** @typedef {import('./logic.js').Step} Step */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderStepsProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-steps');
  const count = h('p', { class: 'pj-steps__count' });
  const dots = h('ol', { class: 'pj-steps__dots', 'aria-hidden': 'true' });
  const single = h('div', { class: 'pj-steps__single' });
  const list = h('ol', { class: 'pj-steps__list' });
  const empty = h('p', { class: 'pj-message' }, t('steps.projectionEmpty'));
  const doneId = ctx.pictos.starterId('acabar');
  const done = h(
    'div',
    { class: 'pj-message pj-message--finished' },
    doneId ? pictoElement({ source: 'arasaac', id: doneId, alt: '' }, { decorative: true }) : null,
    h('p', null, t('steps.allDone')),
  );
  el.append(count, dots, single, list, done, empty);

  /** @param {Step} step @param {'done' | 'now' | 'later'} status @param {number} n */
  const row = (step, status, n) =>
    h(
      'li',
      { class: 'pj-step', dataset: { status } },
      h(
        'span',
        { class: 'pj-step__num' },
        status === 'done' ? icon('check') : String(n),
        status === 'done' ? h('span', { class: 'sr-only' }, t('status.done')) : null,
      ),
      h(
        'div',
        { class: 'pj-step__picto' },
        step.picto ? pictoElement(step.picto, { decorative: true }) : null,
      ),
      h('p', { class: 'pj-step__label' }, step.label),
    );

  let lastKey = '';
  return {
    update(state) {
      const s = state.live.modules.steps;
      if (!s) return;
      const view = state.live.config.steps?.view === 'list' ? 'list' : 'single';
      const active = activeSteps(s, state.live);
      const key = JSON.stringify([view, active.index, active.steps]);
      if (key === lastKey) return;
      lastKey = key;

      el.dataset.view = view;
      const total = active.steps.length;
      const finished = total > 0 && active.index >= total;
      empty.hidden = total > 0;
      done.hidden = !finished || view === 'list';
      count.hidden = total === 0 || finished;
      count.textContent = total ? t('steps.count', { n: active.index + 1, count: total }) : '';
      dots.hidden = total === 0;
      dots.replaceChildren(
        ...active.steps.map((_, i) =>
          h('li', {
            dataset: { status: i < active.index ? 'done' : i === active.index ? 'now' : 'later' },
          }),
        ),
      );

      single.hidden = view !== 'single' || total === 0 || finished;
      const current = active.steps[active.index];
      single.replaceChildren(
        ...(current
          ? [
              current.picto
                ? h(
                    'div',
                    { class: 'pj-steps__picto' },
                    pictoElement(current.picto, { decorative: true }),
                  )
                : '',
              h('p', { class: 'pj-steps__label' }, current.label),
            ]
          : []),
      );

      list.hidden = view !== 'list' || total === 0;
      list.replaceChildren(
        ...active.steps.map((step, i) =>
          row(step, i < active.index ? 'done' : i === active.index ? 'now' : 'later', i + 1),
        ),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
