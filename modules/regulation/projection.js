// @ts-check
// Regulació a la projecció.
//   - Termòmetre: els nivells de baix (calma) a dalt (més intensitat), cadascun
//     amb el seu color, el nom i les estratègies. És una referència per a tot el
//     grup; no marca ni registra com està ningú.
//   - Respiració guiada: una forma que s'expandeix i es contrau al ritme triat,
//     amb el text de la fase i un comptador. Amb «moviment reduït», la forma
//     queda quieta i es guien només pel text i el comptador.

import { h } from '../../core/dom.js';
import { pictoElement } from '../../components/tea-picto.js';
import { prefersReducedMotion } from '../../core/appearance.js';
import { breathingPhase, PATTERNS } from './logic.js';

/** @typedef {import('./logic.js').RegulationState} RegulationState */

const SMALL = 0.55;

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderRegulationProjection(el, ctx) {
  const { t } = ctx;
  el.classList.add('pj-regulation');

  // --- Termòmetre ---------------------------------------------------------------------
  const levels = h('ol', { class: 'pj-thermo' });
  const thermoEmpty = h('p', { class: 'pj-message' }, t('regulation.projectionEmpty'));
  const thermometer = h(
    'div',
    { class: 'pj-regulation__thermometer' },
    h('h2', { class: 'pj-regulation__title' }, t('regulation.projectionThermometer')),
    levels,
    thermoEmpty,
  );

  // --- Respiració ---------------------------------------------------------------------
  const shape = h('div', { class: 'pj-breath__shape', 'aria-hidden': 'true' });
  const phaseText = h('p', { class: 'pj-breath__phase' });
  const counter = h('p', { class: 'pj-breath__count', 'aria-hidden': 'true' });
  const breathing = h(
    'div',
    { class: 'pj-regulation__breathing pj-breath' },
    h('div', { class: 'pj-breath__stage' }, shape),
    phaseText,
    counter,
  );
  el.append(thermometer, breathing);

  /** @type {RegulationState | null} */
  let state = null;
  let pattern = '4-6';
  /** @type {Animation | null} */
  let animation = null;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;
  let lastThermo = '';
  let lastPhase = '';

  /** Animació de la forma, sincronitzada amb `breathingSince` (igual a totes les finestres). */
  const syncAnimation = () => {
    animation?.cancel();
    animation = null;
    const since = state?.breathingSince ?? null;
    const reduced = prefersReducedMotion();
    breathing.dataset.reduced = String(reduced);
    if (since === null || reduced || typeof shape.animate !== 'function') return;
    const phases = PATTERNS[pattern] ?? PATTERNS['4-6'];
    const total = phases.reduce((sum, [, s]) => sum + s, 0);
    /** @type {Keyframe[]} */
    const frames = [{ offset: 0, transform: `scale(${SMALL})` }];
    let at = 0;
    let size = SMALL;
    for (const [phase, seconds] of phases) {
      at += seconds;
      if (phase === 'in') size = 1;
      else if (phase === 'out') size = SMALL;
      frames.push({ offset: at / total, transform: `scale(${size})`, easing: 'ease-in-out' });
    }
    animation = shape.animate(frames, {
      duration: total * 1000,
      iterations: Infinity,
      easing: 'linear',
    });
    animation.currentTime = (ctx.now() - since) % (total * 1000);
  };

  const renderPhase = () => {
    const since = state?.breathingSince ?? null;
    if (since === null) {
      const text = t('regulation.breathingPaused');
      if (text !== lastPhase) {
        lastPhase = text;
        phaseText.textContent = text;
        counter.textContent = '';
        breathing.dataset.phase = 'paused';
      }
      return;
    }
    const p = breathingPhase(pattern, ctx.now() - since);
    const key = `${p.phase}:${p.second}:${p.cycle}`;
    if (key === lastPhase) return;
    lastPhase = key;
    breathing.dataset.phase = p.phase;
    phaseText.textContent = t(`regulation.phases.${p.phase}`);
    counter.textContent = String(p.second);
  };

  const startClock = () => {
    clearInterval(timer);
    timer = undefined;
    if (state?.breathingSince != null && state.tool === 'breathing')
      timer = setInterval(renderPhase, 200);
  };

  /** @param {RegulationState} s */
  const renderThermometer = (s) => {
    const key = JSON.stringify(s.levels);
    if (key === lastThermo) return;
    lastThermo = key;
    thermoEmpty.hidden = s.levels.length > 0;
    levels.hidden = s.levels.length === 0;
    levels.replaceChildren(
      ...s.levels.map((level, i) =>
        h(
          'li',
          { class: 'pj-thermo__level', dataset: { color: level.color } },
          h('span', { class: 'pj-thermo__num' }, String(i + 1)),
          h('p', { class: 'pj-thermo__label' }, level.label),
          h(
            'ul',
            { class: 'pj-thermo__strategies' },
            level.strategies.map((st) =>
              h(
                'li',
                { class: 'pj-thermo__strategy' },
                st.picto ? pictoElement(st.picto, { decorative: true }) : null,
                h('span', null, st.label),
              ),
            ),
          ),
        ),
      ),
    );
  };

  let lastSync = '';
  return {
    update(shared) {
      /** @type {RegulationState | undefined} */
      const s = shared.live.modules.regulation;
      if (!s) return;
      state = s;
      pattern = String(shared.live.config.regulation?.pattern ?? '4-6');
      el.dataset.tool = s.tool;
      thermometer.hidden = s.tool !== 'thermometer';
      breathing.hidden = s.tool !== 'breathing';
      renderThermometer(s);
      const sync = `${s.tool}:${s.breathingSince}:${pattern}:${document.documentElement.dataset.motion}`;
      if (sync !== lastSync) {
        lastSync = sync;
        lastPhase = '';
        if (s.tool === 'breathing') syncAnimation();
        else {
          animation?.cancel();
          animation = null;
        }
        startClock();
      }
      renderPhase();
    },
    destroy() {
      clearInterval(timer);
      animation?.cancel();
      el.replaceChildren();
    },
  };
}
