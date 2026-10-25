// @ts-check
// Agenda a la projecció: seqüència d'activitats amb estat fet / ara / després.
// Decisió pedagògica: no es mostren durades ni hores. L'alumnat necessita
// saber QUÈ ve després, no un horari que pot generar ansietat si es desquadra.
//
// Les targetes van en una sola fila que es pot desplaçar amb el dit, el ratolí
// (arrossegant o amb la roda) i el teclat, per veure tota la seqüència del dia.
// La posició del desplaçament és local de cada finestra: no se sincronitza, així
// la pissarra i la vista prèvia del panell no es «barallen». Després d'uns
// segons sense tocar-la, i sempre que canvia l'activitat, l'agenda torna a
// centrar-se a l'activitat actual: és el punt de referència estable.

import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { getAgenda, isFinished, statusOf } from './selectors.js';
import { prefersReducedMotion } from '../../core/appearance.js';

/** @typedef {import('../../core/types.js').ModuleContext} ModuleContext */
/** @typedef {import('../../core/types.js').Activity} Activity */
/** @typedef {import('./selectors.js').ActivityStatus} ActivityStatus */

/** Temps sense tocar l'agenda abans que torni a centrar-se a l'activitat actual. */
export const RECENTER_MS = 15_000;

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
  // Zona desplaçable: es pot enfocar amb el tabulador i llavors les fletxes la
  // desplacen (en lloc de canviar d'activitat).
  const scroller = h(
    'div',
    {
      class: 'pj-agenda__scroller',
      tabindex: 0,
      role: 'region',
      'aria-label': t('agenda.scrollLabel'),
    },
    list,
  );
  // Indicadors discrets de «n'hi ha més», sense moviment.
  const moreStart = h(
    'span',
    { class: 'pj-agenda__more pj-agenda__more--start', 'aria-hidden': 'true' },
    icon('prev'),
  );
  const moreEnd = h(
    'span',
    { class: 'pj-agenda__more pj-agenda__more--end', 'aria-hidden': 'true' },
    icon('next'),
  );
  const strip = h('div', { class: 'pj-agenda__strip' }, scroller, moreStart, moreEnd);
  const empty = h('p', { class: 'pj-message' }, t('agenda.projectionEmpty'));
  const doneId = ctx.pictos.starterId('acabar');
  const finished = h(
    'div',
    { class: 'pj-message pj-message--finished' },
    doneId ? pictoElement({ source: 'arasaac', id: doneId, alt: '' }, { decorative: true }) : null,
    h('p', null, t('agenda.finished')),
  );
  el.append(strip, empty, finished);

  /** @type {Map<string, { el: HTMLElement, key: string }>} */
  const cards = new Map();
  /** @type {unknown} */
  let lastAgenda = null;
  /** @type {unknown} */
  let lastView = null;
  /** @type {string | null} */
  let currentId = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let idleTimer;

  // --- Desplaçament ---------------------------------------------------------------
  // Sense scroll-snap: el navegador «estirava» la fila cap a la targeta més
  // propera després de cada pas de la roda o d'arrossegar, i el moviment
  // s'encallava. En lloc d'això, un desplaçament suau propi: la posició es mou
  // a poc a poc cap a l'objectiu (roda, teclat, centrar) i, en deixar anar el
  // ratolí, continua una mica amb la velocitat que portava (inèrcia).
  // La posició es compta des de l'inici de la fila (també de dreta a esquerra).

  const sign = () => (getComputedStyle(scroller).direction === 'rtl' ? -1 : 1);
  const maxPos = () => Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const getPos = () => Math.abs(scroller.scrollLeft);
  /** @param {number} p */
  const setPos = (p) => {
    scroller.scrollLeft = sign() * p;
  };

  /** @type {number | null} */
  let goal = null;
  let frame = 0;

  const stopAnimation = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    goal = null;
  };

  const animate = () => {
    if (goal === null) return;
    const pos = getPos();
    const diff = goal - pos;
    if (Math.abs(diff) < 1) {
      setPos(goal);
      stopAnimation();
      return;
    }
    // Com a mínim un píxel per pas: el navegador arrodoneix la posició i, amb
    // passos més petits, la fila es quedaria encallada a prop de l'objectiu.
    setPos(pos + Math.sign(diff) * Math.max(Math.abs(diff) * 0.18, 1));
    frame = requestAnimationFrame(animate);
  };

  /** Va a una posició, suaument si no cal reduir el moviment. @param {number} p */
  const scrollToPos = (p) => {
    goal = Math.min(maxPos(), Math.max(0, p));
    if (prefersReducedMotion()) {
      setPos(goal);
      stopAnimation();
      return;
    }
    if (!frame) frame = requestAnimationFrame(animate);
  };

  const updateEdges = () => {
    const pos = getPos();
    const max = maxPos();
    strip.dataset.moreStart = String(pos > 2);
    strip.dataset.moreEnd = String(max - pos > 2);
  };

  /** Centra l'activitat actual. @param {boolean} smooth */
  const center = (smooth) => {
    const target = currentId ? cards.get(currentId)?.el : null;
    if (!target || !target.isConnected || scroller.clientWidth === 0) return;
    const box = scroller.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const delta = rect.left + rect.width / 2 - (box.left + box.width / 2);
    if (Math.abs(delta) < 1) return;
    const p = getPos() + delta * sign();
    if (smooth) scrollToPos(p);
    else {
      stopAnimation();
      setPos(Math.min(maxPos(), Math.max(0, p)));
    }
  };

  /** Cada interacció del docent o de l'alumnat torna a comptar els 15 s. */
  const touched = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => center(true), RECENTER_MS);
  };

  /** Mida d'un pas amb el teclat: una targeta. */
  const step = () => {
    const first = list.firstElementChild;
    return first instanceof HTMLElement ? first.offsetWidth : scroller.clientWidth / 3;
  };

  scroller.addEventListener('scroll', updateEdges, { passive: true });

  // Roda del ratolí o del ratolí tàctil: el moviment vertical desplaça la fila.
  scroller.addEventListener(
    'wheel',
    (event) => {
      touched();
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;
      event.preventDefault();
      // Les rodes «per línies» (Firefox) envien valors petits.
      const px = event.deltaMode === 1 ? delta * 40 : delta;
      scrollToPos((goal ?? getPos()) + px);
    },
    { passive: false },
  );

  // Dit: desplaçament natiu del navegador (touch-action: pan-x), amb la seva inèrcia.
  // Ratolí: arrossegar, amb inèrcia en deixar anar.
  scroller.addEventListener('pointerdown', (event) => {
    touched();
    stopAnimation();
    // Tocar l'agenda no l'ha d'enfocar: si no, les fletxes del comandament de
    // presentació la desplaçarien en lloc d'avançar l'activitat.
    event.preventDefault();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const dir = sign();
    const startX = event.clientX;
    const startPos = getPos();
    let lastX = startX;
    let lastTime = event.timeStamp;
    let velocity = 0; // px per ms, en el sentit de la fila
    scroller.setPointerCapture(event.pointerId);
    strip.dataset.dragging = 'true';
    /** @param {PointerEvent} e */
    const move = (e) => {
      setPos(Math.min(maxPos(), Math.max(0, startPos - (e.clientX - startX) * dir)));
      const dt = e.timeStamp - lastTime;
      if (dt > 0) velocity = 0.8 * ((-(e.clientX - lastX) * dir) / dt) + 0.2 * velocity;
      lastX = e.clientX;
      lastTime = e.timeStamp;
    };
    /** @param {PointerEvent} e */
    const up = (e) => {
      delete strip.dataset.dragging;
      touched();
      scroller.removeEventListener('pointermove', move);
      scroller.removeEventListener('pointerup', up);
      scroller.removeEventListener('pointercancel', up);
      // Inèrcia: només si el punter encara es movia en deixar-lo anar.
      if (e.timeStamp - lastTime < 80 && Math.abs(velocity) > 0.05) {
        scrollToPos(getPos() + velocity * 260);
      }
    };
    scroller.addEventListener('pointermove', move);
    scroller.addEventListener('pointerup', up);
    scroller.addEventListener('pointercancel', up);
  });
  scroller.addEventListener(
    'touchstart',
    () => {
      touched();
      stopAnimation();
    },
    { passive: true },
  );

  // Teclat (només quan la zona té el focus): fletxes, Inici i Fi.
  scroller.addEventListener('keydown', (event) => {
    const dir = sign();
    const base = goal ?? getPos();
    if (event.key === 'ArrowRight') scrollToPos(base + step() * dir);
    else if (event.key === 'ArrowLeft') scrollToPos(base - step() * dir);
    else if (event.key === 'Home') scrollToPos(0);
    else if (event.key === 'End') scrollToPos(maxPos());
    else return;
    // Així les dreceres globals (activitat següent) no s'activen.
    event.preventDefault();
    touched();
  });

  const resize =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          center(false);
          updateEdges();
        });
  resize?.observe(scroller);

  return {
    update(state) {
      const s = getAgenda(state.live);
      const view = state.live.config.agenda?.view ?? 'all';
      if (s === lastAgenda && view === lastView) return;
      const viewChanged = view !== lastView;
      lastAgenda = s;
      lastView = view;
      if (!s) return;

      el.dataset.view = String(view);
      const done = isFinished(s);
      empty.hidden = s.activities.length > 0;
      finished.hidden = !done;
      strip.hidden = done || s.activities.length === 0;

      const seen = new Set();
      s.activities.forEach((a, pos) => {
        const status = statusOf(s, pos);
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

      // Quan l'activitat canvia (o la vista), es torna a centrar a l'actual.
      const nextId = s.activities[s.currentIndex]?.id ?? null;
      const moved = nextId !== currentId;
      currentId = nextId;
      if (moved || viewChanged) {
        // Esperem que el navegador col·loqui les targetes noves.
        requestAnimationFrame(() => {
          center(!viewChanged);
          updateEdges();
        });
      } else {
        updateEdges();
      }
    },
    destroy() {
      clearTimeout(idleTimer);
      stopAnimation();
      resize?.disconnect();
      el.replaceChildren();
    },
  };
}
