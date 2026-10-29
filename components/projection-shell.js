// @ts-check
// Carcassa de la projecció. És el mateix codi per a la finestra de projecció,
// la vista prèvia del panell i el mode classe (una sola pantalla).
//
// Zones fixes (consistència absoluta: cada cosa sempre al mateix lloc). El
// docent pot canviar l'alçada de les franges (core/layout.js), però mai l'ordre:
//   ┌──────────────────────────────────────┐
//   │ Ara: … → Després: …   (franja sup.)  │
//   ├──────────────────────────────────────┤
//   │                                      │
//   │   Escenari: UN sol mòdul             │
//   │                                      │
//   ├──────────────────────────────────────┤
//   │ Avisos de transició                  │
//
// Si es vol, el rellotge digital surt a la cantonada dreta d'una de les dues franges.
//
// L'atribució d'ARASAAC no surt a la projecció (seria un distractor per a
// l'alumnat): es mostra al peu del panell del docent i a l'Ajuda.
//   └──────────────────────────────────────┘

import { h } from '../core/dom.js';
import { icon } from './icons.js';
import { pictoElement } from './tea-picto.js';
import { FOOTER_EM, HEADER_EM, liveLayout } from '../core/layout.js';
import { formatTimeOfDay } from '../core/clock.js';
import {
  currentActivity,
  getAgenda,
  isFinished,
  nextActivity,
} from '../modules/agenda/selectors.js';

/** @typedef {import('../core/types.js').SharedState} SharedState */
/** @typedef {import('../core/types.js').ModuleContext} ModuleContext */
/** @typedef {import('../core/types.js').Activity} Activity */
/** @typedef {import('../core/types.js').View} View */

/** @param {import('../core/types.js').Translate} t */
function createHeader(t) {
  // La franja és un contenidor: el contingut (a `inner`) s'escala amb la seva alçada.
  const inner = h('div', { class: 'pj-header__inner' });
  const el = h('div', { class: 'pj-header' }, inner);
  /** @type {unknown} */
  let last = null;

  /** @param {string} title @param {Activity | null} a @param {string} slot */
  const block = (title, a, slot) =>
    h(
      'div',
      { class: `pj-header__item pj-header__item--${slot}` },
      h('span', { class: 'pj-header__title' }, title),
      a?.picto ? pictoElement(a.picto, { decorative: true }) : null,
      h('span', { class: 'pj-header__label' }, a ? a.label : '—'),
    );

  return {
    el,
    /** @param {SharedState} state */
    update(state) {
      const agenda = getAgenda(state.live);
      if (agenda === last) return;
      last = agenda;
      if (!agenda || agenda.activities.length === 0) {
        inner.replaceChildren();
        return;
      }
      if (isFinished(agenda)) {
        inner.replaceChildren(
          h(
            'div',
            { class: 'pj-header__item' },
            h('span', { class: 'pj-header__label' }, t('agenda.finished')),
          ),
        );
        return;
      }
      const now = currentActivity(agenda);
      const next = nextActivity(agenda);
      inner.replaceChildren(
        block(t('status.now'), now, 'now'),
        h('span', { class: 'pj-header__arrow', 'aria-hidden': 'true' }, icon('arrow')),
        block(t('status.next'), next, 'next'),
      );
    },
  };
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   registry: import('../core/registry.js').Registry,
 *   t: import('../core/types.js').Translate,
 *   ctxFor: (moduleId: string) => ModuleContext,
 *   mode: 'window' | 'preview' | 'class',
 * }} options
 */
export function mountProjection(host, { registry, t, ctxFor, mode }) {
  // `host` fa de contenidor (container-type: size); la projecció va a dins perquè
  // les unitats cq* es resolguin respecte de la seva mida.
  const root = h('div', { class: 'projection', dataset: { mode } });
  host.replaceChildren(root);

  const header = createHeader(t);
  const stage = h('div', { class: 'pj-stage', role: mode === 'window' ? 'main' : null });
  const footerSlots = h('div', { class: 'pj-footer__modules' });
  const footer = h(
    'div',
    { class: 'pj-footer' },
    h('div', { class: 'pj-footer__inner' }, footerSlots),
  );
  const calm = h(
    'div',
    { class: 'pj-calm', hidden: true },
    h('div', { class: 'pj-calm__shape', 'aria-hidden': 'true' }),
    h('p', { class: 'pj-calm__text' }, t('calm.message')),
  );

  /** @type {{ id: string, slot: HTMLElement, view: View, region: string }[]} */
  const views = [];
  for (const mod of registry.all()) {
    const slot = h('div', { class: `pj-slot pj-slot--${mod.id}`, dataset: { module: mod.id } });
    (mod.region === 'stage' ? stage : footerSlots).append(slot);
    views.push({
      id: mod.id,
      slot,
      region: mod.region,
      view: mod.renderProjection(slot, ctxFor(mod.id)),
    });
  }

  root.replaceChildren(header.el, stage, footer, calm);

  // Rellotge: un sol element que es mou a la franja triada (a la dreta del contingut).
  const clock = h('time', { class: 'pj-clock', hidden: true });
  /** @param {number} now */
  const showTime = (now) => {
    if (clock.hidden) return;
    const text = formatTimeOfDay(now);
    if (clock.textContent !== text) clock.textContent = text;
  };

  let lastLayout = '';

  return {
    root,
    /** @param {SharedState} state */
    update(state) {
      const { live } = state;
      const layout = liveLayout(live);
      const layoutKey = `${layout.header}:${layout.footer}:${layout.clock}`;
      if (layoutKey !== lastLayout) {
        lastLayout = layoutKey;
        root.dataset.header = layout.header;
        root.dataset.footer = layout.footer;
        root.style.setProperty('--pj-header-h', `${HEADER_EM[layout.header]}em`);
        root.style.setProperty('--pj-footer-h', `${FOOTER_EM[layout.footer]}em`);
        clock.hidden = layout.clock === 'off';
        if (layout.clock === 'header') header.el.append(clock);
        else if (layout.clock === 'footer') footer.append(clock);
        showTime(Date.now());
      }
      root.dataset.calm = String(live.calm);
      calm.hidden = !live.calm;
      header.update(state);
      for (const { id, slot, region, view } of views) {
        if (region === 'stage') slot.hidden = id !== live.stage;
        view.update(state);
      }
    },
    /** @param {number} now */
    tick(now) {
      showTime(now);
      for (const { view } of views) view.tick?.(now);
    },
    /** Valor efímer d'un mòdul (vegeu ControlUi.publish). @param {string} moduleId @param {unknown} value */
    transient(moduleId, value) {
      views.find((v) => v.id === moduleId)?.view.transient?.(value);
    },
    destroy() {
      for (const { view } of views) view.destroy();
      host.replaceChildren();
    },
  };
}
