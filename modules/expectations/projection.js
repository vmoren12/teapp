// @ts-check
// Expectatives a la projecció: quatre caselles fixes, sempre en el mateix
// ordre i lloc (On treballo? Com parlo? Què necessito? Quan acabo?).
// Decisió pedagògica: fa explícites les normes implícites, sempre amb el mateix
// format. «Com parlo?» fa servir l'escala de veu 0–4, la mateixa del sonòmetre.

import { h } from '../../core/dom.js';
import { minutesLeft } from '../../core/clock.js';
import { pictoElement } from '../../components/tea-picto.js';
import { activeBoard, isEmptyBoard } from './logic.js';
import { VOICE_LEVELS, voiceKey } from '../shared/voice.js';
import { remaining, timerView } from '../timer/logic.js';

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderExpectationsProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-expect');

  /** @param {string} field */
  const cell = (field) => {
    const body = h('div', { class: 'pj-expect__body' });
    const section = h(
      'section',
      { class: `pj-expect__cell pj-expect__cell--${field}` },
      h('h2', { class: 'pj-expect__question' }, t(`expectations.questions.${field}`)),
      body,
    );
    return { section, body };
  };
  const where = cell('where');
  const voice = cell('voice');
  const need = cell('need');
  const when = cell('when');
  const grid = h(
    'div',
    { class: 'pj-expect__grid' },
    where.section,
    voice.section,
    need.section,
    when.section,
  );
  const empty = h('p', { class: 'pj-message' }, t('expectations.projectionEmpty'));
  el.append(grid, empty);

  const timerText = h('p', { class: 'pj-expect__timer' });

  /** @param {{ label: string, picto: import('../../core/types.js').PictoRef | null }} answer */
  const answer = (answer) => [
    h(
      'div',
      { class: 'pj-expect__picto' },
      answer.picto ? pictoElement(answer.picto, { decorative: true }) : null,
    ),
    h('p', { class: 'pj-expect__answer' }, answer.label || '—'),
  ];

  /** @type {import('../../core/types.js').SharedState | null} */
  let shared = null;
  let showTimer = false;
  let lastKey = '';
  let lastTimer = '';

  /** @param {number} now */
  function tick(now) {
    if (!shared || !showTimer) return;
    const s = shared.live.modules.timer;
    const text = s
      ? t('timer.minutesLeft', { count: minutesLeft(remaining(timerView(s, shared.live), now)) })
      : '';
    if (text !== lastTimer) {
      lastTimer = text;
      timerText.textContent = text;
    }
  }

  return {
    update(state) {
      shared = state;
      const s = state.live.modules.expectations;
      if (!s) return;
      const { board } = activeBoard(s, state.live);
      const key = JSON.stringify(board);
      if (key !== lastKey) {
        lastKey = key;
        const blank = isEmptyBoard(board);
        empty.hidden = !blank;
        grid.hidden = blank;
        where.body.replaceChildren(...answer(board.where));
        need.body.replaceChildren(...answer(board.need));
        when.body.replaceChildren(...answer(board.when), board.when.timer ? timerText : '');
        // Escala de veu: es veuen els cinc nivells i es destaca el que toca
        // (no només amb color: també amb mida, vora i el nom escrit).
        voice.body.replaceChildren(
          h(
            'ol',
            { class: 'pj-voice', 'aria-hidden': 'true' },
            VOICE_LEVELS.map((level) =>
              h(
                'li',
                { dataset: { level: String(level), active: String(board.voice === level) } },
                String(level),
              ),
            ),
          ),
          h(
            'p',
            { class: 'pj-expect__answer' },
            board.voice === null ? '—' : t(voiceKey(board.voice)),
          ),
        );
        showTimer = board.when.timer;
        lastTimer = '';
      }
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
