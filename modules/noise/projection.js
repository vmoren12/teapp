// @ts-check
// Sonòmetre a la projecció: una barra amb les cinc zones de l'escala de veu i
// una marca que es mou a poc a poc. Quan el grup passa del llindar, el color
// canvia de manera gradual: sense sons d'alarma, sense vermells que parpellegin.
// Decisió pedagògica: és un feedback del GRUP, mai individual, i substitueix
// els avisos verbals repetits.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { noiseLimit, sanitizeReading } from './logic.js';
import { overLimit } from './meter.js';
import { VOICE_LEVELS, voiceKey } from '../shared/voice.js';

/** Si no arriba cap lectura en aquest temps, el micròfon es dona per apagat. */
const STALE_MS = 2500;

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderNoiseProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-noise');
  const marker = h('div', { class: 'pj-noise__marker' });
  const zones = h(
    'ol',
    { class: 'pj-noise__zones' },
    VOICE_LEVELS.map((level) =>
      h(
        'li',
        { class: 'pj-noise__zone', dataset: { level: String(level) } },
        h('span', { class: 'pj-noise__name' }, t(voiceKey(level))),
      ),
    ),
  );
  const meter = h('div', { class: 'pj-noise__meter', 'aria-hidden': 'true' }, zones, marker);
  const caption = h('p', { class: 'pj-noise__caption' });
  const off = h(
    'p',
    { class: 'pj-message pj-noise__off' },
    icon('micOff'),
    t('noise.projectionOff'),
  );
  el.append(h('h2', { class: 'pj-noise__title' }, t('noise.projectionTitle')), meter, caption, off);

  let limit = 2;
  let level = 0;
  let active = false;
  let lastReading = 0;
  let lastCaption = '';

  const render = () => {
    el.dataset.active = String(active);
    meter.hidden = !active;
    off.hidden = active;
    // Cada zona ocupa una cinquena part: el nivell 1,5 cau al mig de la zona 1.
    el.style.setProperty('--level', (level / 5).toFixed(3));
    el.style.setProperty('--over', overLimit(level, limit).toFixed(3));
    for (const zone of zones.children) {
      const n = Number(/** @type {HTMLElement} */ (zone).dataset.level);
      /** @type {HTMLElement} */ (zone).dataset.allowed = String(n <= limit);
    }
    const text = active ? t('noise.limitCaption', { name: t(voiceKey(limit)) }) : '';
    if (text !== lastCaption) {
      lastCaption = text;
      caption.textContent = text;
      caption.hidden = !text;
    }
  };
  render();

  return {
    update(state) {
      limit = noiseLimit(state.live.config.noise ?? {}, state.live);
      render();
    },
    transient(value) {
      const reading = sanitizeReading(value);
      if (!reading) return;
      active = reading.active;
      level = reading.level;
      lastReading = ctx.now();
      render();
    },
    tick(now) {
      if (active && now - lastReading > STALE_MS) {
        active = false;
        level = 0;
        render();
      }
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
