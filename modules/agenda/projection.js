// @ts-check
// Agenda a la projecció: seqüència d'activitats amb estat fet / ara / després.
// Decisió pedagògica: no es mostren durades ni hores. L'alumnat necessita
// saber QUÈ ve després, no un horari que pot generar ansietat si es desquadra.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { getAgenda, isFinished, statusOf } from './selectors.js';

/** @typedef {import('../../core/types.js').ModuleContext} ModuleContext */
/** @typedef {import('../../core/types.js').Activity} Activity */
/** @typedef {import('./selectors.js').ActivityStatus} ActivityStatus */

/**
 * @param {Activity} a
 * @param {ActivityStatus} status
 * @param {import('../../core/types.js').Translate} t
 */
function card(a, status, t) {
  const badgeText = {
    done: t('status.done'),
    now: t('status.now'),
    next: t('status.next'),
    later: '',
  }[status];
  return h(
    'li',
    { class: 'pj-card', dataset: { status, kind: a.kind } },
    h(
      'div',
      { class: 'pj-card__badges' },
      badgeText &&
        h(
          'span',
          { class: 'pj-badge pj-badge--status' },
          status === 'done' && icon('check'),
          badgeText,
        ),
      a.kind === 'change' &&
        h('span', { class: 'pj-badge pj-badge--change' }, icon('change'), t('status.change')),
    ),
    h(
      'div',
      { class: 'pj-card__picto' },
      a.picto ? pictoElement(a.picto, { decorative: true }) : null,
    ),
    h('p', { class: 'pj-card__label' }, a.label),
  );
}

/**
 * @param {HTMLElement} el
 * @param {ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderAgendaProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-agenda');
  const list = h('ol', { class: 'pj-agenda__list' });
  const empty = h('p', { class: 'pj-message' }, t('agenda.projectionEmpty'));
  const doneId = ctx.pictos.starterId('acabar');
  const finished = h(
    'div',
    { class: 'pj-message pj-message--finished' },
    doneId ? pictoElement({ source: 'arasaac', id: doneId, alt: '' }, { decorative: true }) : null,
    h('p', null, t('agenda.finished')),
  );
  el.append(list, empty, finished);

  /** @type {Map<string, { el: HTMLElement, key: string }>} */
  const cards = new Map();
  /** @type {unknown} */
  let lastAgenda = null;
  /** @type {unknown} */
  let lastView = null;

  return {
    update(state) {
      const s = getAgenda(state.live);
      const view = state.live.config.agenda?.view ?? 'all';
      if (s === lastAgenda && view === lastView) return;
      lastAgenda = s;
      lastView = view;
      if (!s) return;

      el.dataset.view = String(view);
      const done = isFinished(s);
      empty.hidden = s.activities.length > 0;
      finished.hidden = !done;
      list.hidden = done || s.activities.length === 0;

      // Vista «ara i després»: només l'anterior, l'actual i la següent.
      const visible = s.activities
        .map((a, i) => ({ a, i, status: statusOf(s, i) }))
        .filter(({ i }) => view === 'all' || (i >= s.currentIndex - 1 && i <= s.currentIndex + 1));

      const seen = new Set();
      visible.forEach(({ a, status }, pos) => {
        const key = JSON.stringify([a.label, a.picto?.source, a.picto?.id, a.kind, status]);
        let entry = cards.get(a.id);
        if (!entry || entry.key !== key) {
          const next = card(a, status, t);
          entry?.el.replaceWith(next);
          entry = { el: next, key };
          cards.set(a.id, entry);
        }
        seen.add(a.id);
        if (list.children[pos] !== entry.el)
          list.insertBefore(entry.el, list.children[pos] ?? null);
      });
      for (const [id, entry] of cards) {
        if (!seen.has(id)) {
          entry.el.remove();
          cards.delete(id);
        }
      }
      list.style.setProperty('--count', String(visible.length));
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
