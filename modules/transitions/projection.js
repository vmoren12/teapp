// @ts-check
// Avís de transició a la franja inferior de la projecció. Sempre apareix al
// mateix lloc, sense finestres emergents ni parpellejos.

import { append, h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { getAgenda } from '../agenda/selectors.js';
import { computeWarning, warningKey } from './logic.js';

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderTransitionsProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-transition');
  /** @type {import('../../core/types.js').SharedState | null} */
  let shared = null;
  let lastKey = '?';

  /** @param {number} now */
  function tick(now) {
    if (!shared) return;
    const agenda = getAgenda(shared.live);
    const warning = computeWarning(agenda, shared.live.config.transitions ?? {}, now);
    const next = warning?.next;
    const key = `${warningKey(agenda, warning)}:${next?.label}:${next?.picto?.id}`;
    if (key === lastKey) return;
    lastKey = key;

    if (!warning) {
      el.hidden = true;
      el.replaceChildren();
      return;
    }
    el.hidden = false;
    el.dataset.kind = warning.kind;
    const text =
      warning.kind === 'due'
        ? t('transitions.due')
        : t('transitions.left', { count: warning.minutes });
    el.replaceChildren();
    append(el, [
      h(
        'span',
        { class: 'pj-transition__icon', 'aria-hidden': 'true' },
        icon(warning.kind === 'due' ? 'change' : 'clock'),
      ),
      h('p', { class: 'pj-transition__text' }, text),
      warning.steps.length > 0 &&
        h(
          'ol',
          { class: 'pj-transition__steps', 'aria-hidden': 'true' },
          warning.steps.map((_, i) =>
            h('li', { dataset: { reached: String(i < warning.reached) } }),
          ),
        ),
      h(
        'div',
        { class: 'pj-transition__next' },
        h('span', { class: 'pj-transition__then' }, t('status.next')),
        next?.picto ? pictoElement(next.picto, { decorative: true }) : null,
        h('span', { class: 'pj-transition__label' }, next ? next.label : t('transitions.end')),
      ),
    ]);
  }

  return {
    update(state) {
      shared = state;
      lastKey = '?';
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
