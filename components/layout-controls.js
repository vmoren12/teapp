// @ts-check
// Alçada de les franges de la projecció (secció «A la pantalla» del panell).
// Hi ha dues maneres equivalents de canviar-la (WCAG 2.5.7):
//   - controls lliscants amb passos fixos, al panell;
//   - tiradors arrossegables damunt de la vista prèvia, que també es poden moure
//     amb les fletxes del teclat.

import { h } from '../core/dom.js';
import { button } from './button.js';
import {
  CLOCK_POSITIONS,
  FOOTER_EM,
  FOOTER_SIZES,
  HEADER_EM,
  HEADER_SIZES,
  liveLayout,
} from '../core/layout.js';

/** @typedef {import('../core/types.js').Layout} Layout */
/** @typedef {'header' | 'footer'} Band */

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   setLayout: (patch: Partial<Layout>) => void,
 *   resetLayout: () => void,
 *   previewEl: HTMLElement,
 *   projectionRoot: () => HTMLElement,
 * }} deps
 */
export function createLayoutControls({ t, setLayout, resetLayout, previewEl, projectionRoot }) {
  /** @type {Record<Band, readonly string[]>} */
  const sizes = { header: HEADER_SIZES, footer: FOOTER_SIZES };
  /** @type {Record<Band, Record<string, number>>} */
  const ems = { header: HEADER_EM, footer: FOOTER_EM };
  /** @type {Layout} */
  let layout = { header: 'medium', footer: 'medium', clock: 'off' };

  /** @param {Band} band @param {number} index */
  const choose = (band, index) => {
    const list = sizes[band];
    const value = list[Math.max(0, Math.min(list.length - 1, index))];
    if (value !== layout[band]) setLayout({ [band]: value });
  };
  /** @param {Band} band */
  const indexOf = (band) => sizes[band].indexOf(layout[band]);

  // --- Controls lliscants ---------------------------------------------------------
  /** @param {Band} band */
  const slider = (band) => {
    const id = `layout-${band}`;
    const output = h('output', { for: id, class: 'field__value' });
    const input = h('input', {
      type: 'range',
      id,
      min: 0,
      max: sizes[band].length - 1,
      step: 1,
    });
    input.addEventListener('input', () => choose(band, Number(input.value)));
    const el = h(
      'div',
      { class: 'field' },
      h(
        'div',
        { class: 'field__row' },
        h('label', { for: id, class: 'field__label' }, t(`layout.${band}`)),
        output,
      ),
      input,
    );
    return {
      el,
      update() {
        const text = t(`layout.sizes.${layout[band]}`);
        input.value = String(indexOf(band));
        input.setAttribute('aria-valuetext', text);
        output.textContent = text;
      },
    };
  };

  const header = slider('header');
  const footer = slider('footer');

  // --- Rellotge digital ---------------------------------------------------------------
  const clockSelect = h(
    'select',
    { id: 'layout-clock', class: 'input' },
    CLOCK_POSITIONS.map((v) => h('option', { value: v }, t(`layout.clocks.${v}`))),
  );
  clockSelect.addEventListener('change', () =>
    setLayout({ clock: /** @type {Layout['clock']} */ (clockSelect.value) }),
  );
  const clockField = h(
    'div',
    { class: 'field' },
    h('label', { for: 'layout-clock', class: 'field__label' }, t('layout.clock')),
    clockSelect,
    h('p', { class: 'field__hint' }, t('layout.clockHint')),
  );

  const panel = h(
    'details',
    { class: 'pane__config layout-controls' },
    h('summary', null, t('layout.title')),
    h('p', { class: 'field__hint' }, t('layout.hint')),
    header.el,
    footer.el,
    clockField,
    h(
      'div',
      { class: 'btn-row' },
      button({ label: t('layout.reset'), icon: 'reset', onClick: resetLayout }),
    ),
  );

  // --- Tiradors damunt de la vista prèvia ------------------------------------------
  // La vista prèvia és inert (no rep el ratolí); els tiradors van en una capa a part.
  /** @param {Band} band */
  const handle = (band) => {
    const el = h(
      'div',
      {
        class: `layout-handle layout-handle--${band}`,
        role: 'slider',
        tabindex: 0,
        'aria-orientation': 'vertical',
        'aria-label': t(`layout.handle.${band}`),
        'aria-valuemin': 0,
        'aria-valuemax': sizes[band].length - 1,
      },
      h('span', { class: 'layout-handle__grip', 'aria-hidden': 'true' }),
    );
    // Les fletxes mouen el tirador en la mateixa direcció en què es veu: a la
    // franja superior, avall la fa més gran; a la inferior, amunt.
    el.addEventListener('keydown', (event) => {
      const grow = band === 'header' ? 'ArrowDown' : 'ArrowUp';
      const shrink = band === 'header' ? 'ArrowUp' : 'ArrowDown';
      let index = indexOf(band);
      if (event.key === grow || event.key === 'ArrowRight') index += 1;
      else if (event.key === shrink || event.key === 'ArrowLeft') index -= 1;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = sizes[band].length - 1;
      else return;
      event.preventDefault();
      choose(band, index);
    });
    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      el.focus();
      el.setPointerCapture(event.pointerId);
      el.dataset.dragging = 'true';
      /** @param {PointerEvent} e */
      const move = (e) => {
        const rect = previewEl.getBoundingClientRect();
        const em = fontPx();
        const target = band === 'header' ? e.clientY - rect.top : rect.bottom - e.clientY;
        // El pas més proper a la posició del punter.
        let best = 0;
        sizes[band].forEach((size, i) => {
          const d = Math.abs(ems[band][size] * em - target);
          if (d < Math.abs(ems[band][sizes[band][best]] * em - target)) best = i;
        });
        choose(band, best);
      };
      const up = () => {
        delete el.dataset.dragging;
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
    return {
      el,
      update() {
        el.setAttribute('aria-valuenow', String(indexOf(band)));
        el.setAttribute('aria-valuetext', t(`layout.sizes.${layout[band]}`));
      },
    };
  };

  const fontPx = () => parseFloat(getComputedStyle(projectionRoot()).fontSize) || 16;
  const headerHandle = handle('header');
  const footerHandle = handle('footer');
  const handles = h('div', { class: 'layout-handles' }, headerHandle.el, footerHandle.el);

  // Posició dels tiradors: a la vora de cada franja (segons la mida triada).
  const place = () => {
    const em = fontPx();
    handles.style.setProperty('--header-y', `${HEADER_EM[layout.header] * em}px`);
    handles.style.setProperty('--footer-y', `${FOOTER_EM[layout.footer] * em}px`);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(place).observe(previewEl);

  return {
    panel,
    handles,
    /** @param {import('../core/types.js').SharedState} state */
    update(state) {
      layout = liveLayout(state.live);
      header.update();
      footer.update();
      clockSelect.value = layout.clock;
      headerHandle.update();
      footerHandle.update();
      place();
    },
  };
}
