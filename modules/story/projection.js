// @ts-check
// Història social a la projecció. Dues vistes:
//   - una vinyeta gran cada vegada (imatge i frase), amb punts de progrés;
//   - seqüencial: totes les vinyetes alhora, en cadena, amb l'actual destacada.
// Es pot controlar des de la mateixa pantalla (pissarra tàctil): fletxes
// discretes als costats i, a la vista seqüencial, tocant una vinyeta.
// Decisió pedagògica: anticipar situacions noves o canvis, sempre adreçat al
// grup, mai a un alumne concret. Veure tota la seqüència alhora ajuda a
// entendre l'ordre dels fets; la vinyeta destacada marca on som.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { currentIndex, currentStory } from './logic.js';

/**
 * Botó de la pantalla: amb el ratolí o el dit no agafa el focus, perquè les
 * fletxes del comandament de presentació continuïn funcionant.
 * @param {Record<string, any>} props @param {...any} children
 */
const screenButton = (props, ...children) =>
  h(
    'button',
    { type: 'button', ...props, onPointerdown: (/** @type {Event} */ e) => e.preventDefault() },
    ...children,
  );

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
  const prevBtn = screenButton(
    { class: 'pj-story__nav pj-story__nav--prev', 'aria-label': t('story.prev') },
    icon('prev'),
  );
  const nextBtn = screenButton(
    { class: 'pj-story__nav pj-story__nav--next', 'aria-label': t('story.next') },
    icon('next'),
  );
  prevBtn.addEventListener('click', () => ctx.dispatch({ type: 'prev' }));
  nextBtn.addEventListener('click', () => ctx.dispatch({ type: 'next' }));
  const single = h('div', { class: 'pj-story__single' }, prevBtn, panel, nextBtn);
  const sequence = h('ol', { class: 'pj-story__sequence' });
  const count = h('p', { class: 'sr-only' });
  const empty = h('p', { class: 'pj-message' }, t('story.projectionEmpty'));
  el.append(title, single, sequence, dots, count, empty);

  let lastKey = '';
  return {
    update(state) {
      const s = state.live.modules.story;
      if (!s) return;
      const config = state.live.config.story ?? {};
      const view = config.view === 'sequence' ? 'sequence' : 'single';
      const controls = config.screenControls !== false;
      const story = currentStory(s);
      const index = currentIndex(s);
      const current = story?.panels[index] ?? null;
      const key = JSON.stringify([view, controls, story, index]);
      if (key === lastKey) return;
      lastKey = key;

      el.dataset.view = view;
      el.dataset.controls = String(controls);
      empty.hidden = Boolean(current);
      title.hidden = !story || !story.title;
      title.textContent = story?.title ?? '';
      single.hidden = !current || view !== 'single';
      sequence.hidden = !current || view !== 'sequence';
      dots.hidden = !story || story.panels.length < 2 || view !== 'single';
      if (!story || !current) return;
      const total = story.panels.length;
      count.textContent = t('story.status', { n: index + 1, count: total });
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index >= total - 1;
      prevBtn.hidden = !controls;
      nextBtn.hidden = !controls;

      if (view === 'single') {
        picto.replaceChildren(
          current.picto ? pictoElement(current.picto, { decorative: true }) : '',
        );
        picto.hidden = !current.picto;
        text.textContent = current.label;
        dots.replaceChildren(
          ...story.panels.map((_, i) =>
            h('li', { dataset: { status: i < index ? 'done' : i === index ? 'now' : 'later' } }),
          ),
        );
        return;
      }

      // Vista seqüencial: la cadena sencera. Cada vinyeta es pot tocar per anar-hi.
      sequence.dataset.count = String(total);
      sequence.replaceChildren(
        ...story.panels.map((p, i) => {
          const status = i < index ? 'done' : i === index ? 'now' : 'later';
          const content = [
            h('span', { class: 'pj-story__num', 'aria-hidden': 'true' }, String(i + 1)),
            h(
              'span',
              { class: 'pj-story__mini-picto' },
              p.picto ? pictoElement(p.picto, { decorative: true }) : null,
            ),
            h('span', { class: 'pj-story__mini-text' }, p.label),
          ];
          const item = controls
            ? screenButton(
                {
                  class: 'pj-story__step',
                  'aria-current': i === index ? 'step' : null,
                  onClick: () => ctx.dispatch({ type: 'goTo', payload: { index: i } }),
                },
                ...content,
              )
            : h(
                'div',
                { class: 'pj-story__step', 'aria-current': i === index ? 'step' : null },
                ...content,
              );
          return h('li', { class: 'pj-story__item', dataset: { status } }, item);
        }),
      );
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
