// @ts-check
// Temporitzador visual a la projecció: un disc (o barra) que s'esgota.
// Decisió pedagògica: per defecte es mostren minuts («Queden 4 min») i no
// segons; veure córrer els segons pot augmentar l'ansietat. Es pot canviar.
// En acabar no hi ha cap parpelleig: el disc queda buit i apareix un missatge.

import { h } from '../../core/dom.js';
import { formatClock, minutesLeft } from '../../core/clock.js';
import { isRunning, progress, remaining, timerView } from './logic.js';

/** @typedef {import('./logic.js').TimerState} TimerState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderTimerProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-timer');
  const label = h('p', { class: 'pj-timer__label' });
  const disc = h('div', { class: 'pj-timer__disc', 'aria-hidden': 'true' });
  const bar = h(
    'div',
    { class: 'pj-timer__bar', 'aria-hidden': 'true' },
    h('div', { class: 'pj-timer__fill' }),
  );
  const digits = h('p', { class: 'pj-timer__digits' });
  const note = h('p', { class: 'pj-timer__note' });
  el.append(label, h('div', { class: 'pj-timer__visual' }, disc, bar), digits, note);

  /** @type {import('./logic.js').TimerView | null} */
  let timer = null;
  /** @type {Record<string, unknown>} */
  let config = {};
  let lastDigits = '';
  let lastNote = '';

  /** @param {number} now */
  function tick(now) {
    if (!timer) return;
    const left = remaining(timer, now);
    const p = progress(timer, now);
    el.style.setProperty('--progress', p.toFixed(4));
    const finished = left <= 0;
    el.dataset.state = finished ? 'done' : isRunning(timer) ? 'running' : 'paused';

    let text = '';
    if (!finished) {
      if (config.digits === 'mmss') text = formatClock(left);
      else if (config.digits === 'minutes')
        text = t('timer.minutesLeft', { count: minutesLeft(left) });
    }
    if (text !== lastDigits) {
      lastDigits = text;
      digits.textContent = text;
      digits.hidden = text === '';
    }
    const noteText = finished ? t('timer.finished') : !isRunning(timer) ? t('timer.paused') : '';
    if (noteText !== lastNote) {
      lastNote = noteText;
      note.textContent = noteText;
      note.hidden = noteText === '';
    }
  }

  return {
    update(state) {
      /** @type {TimerState | undefined} */
      const s = state.live.modules.timer;
      timer = s ? timerView(s, state.live) : null;
      config = state.live.config.timer ?? {};
      el.dataset.shape = String(config.shape ?? 'disc');
      // Lligat i sense text propi: es mostra el nom de l'activitat (i el segueix).
      const text = s?.label || timer?.activity?.label || '';
      label.textContent = text;
      label.hidden = !text;
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
