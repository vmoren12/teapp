// @ts-check
// Història social a la projecció: una vinyeta gran cada vegada (imatge i frase),
// amb el títol a dalt i punts de progrés. Decisió pedagògica: anticipar
// situacions noves o canvis, sempre adreçat al grup, mai a un alumne concret.

import { h } from '../../core/dom.js';
import { pictoElement } from '../../components/tea-picto.js';
import { currentIndex, currentStory } from './logic.js';

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderStoryProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-story');
  const title = h('h2', { class: 'pj-story__title' });
  const dots = h('ol', { class: 'pj-story__dots', 'aria-hidden': 'true' });
  const picto = h('div', { class: 'pj-story__picto' });
  const text = h('p', { class: 'pj-story__text' });
  const panel = h('div', { class: 'pj-story__panel' }, picto, text);
  const count = h('p', { class: 'sr-only' });
  const empty = h('p', { class: 'pj-message' }, t('story.projectionEmpty'));
  el.append(title, panel, dots, count, empty);

  let lastKey = '';
  return {
    update(state) {
      const s = state.live.modules.story;
      if (!s) return;
      const story = currentStory(s);
      const index = currentIndex(s);
      const current = story?.panels[index] ?? null;
      const key = JSON.stringify([story?.title, story?.panels.length, index, current]);
      if (key === lastKey) return;
      lastKey = key;

      empty.hidden = Boolean(current);
      title.hidden = !story || !story.title;
      title.textContent = story?.title ?? '';
      panel.hidden = !current;
      dots.hidden = !story || story.panels.length < 2;
      if (!story || !current) return;
      picto.replaceChildren(current.picto ? pictoElement(current.picto, { decorative: true }) : '');
      picto.hidden = !current.picto;
      text.textContent = current.label;
      count.textContent = t('story.status', { n: index + 1, count: story.panels.length });
      dots.replaceChildren(
        ...story.panels.map((_, i) =>
          h('li', { dataset: { status: i < index ? 'done' : i === index ? 'now' : 'later' } }),
        ),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
