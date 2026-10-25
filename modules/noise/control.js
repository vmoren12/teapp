// @ts-check
// Panell de control del sonòmetre de grup.
//
// Privacitat:
//   - El micròfon només s'activa amb el botó i, mentre és actiu, hi ha un
//     indicador permanent «Micròfon actiu» a la pantalla del panell.
//   - S'apaga sol quan el sonòmetre deixa de ser a l'escenari o es tanca el panell.
//   - Només es calcula el volum; no es grava, no es desa i no hi ha historial.

import { h } from '../../core/dom.js';
import { button, setButton } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { createConfigForm } from '../../components/config-form.js';
import { startMic } from './mic.js';
import { dbToLevel, smooth } from './meter.js';
import { voiceKey } from '../shared/voice.js';

/** @typedef {import('./logic.js').NoiseState} NoiseState */

const SAMPLE_MS = 125;
const CALIBRATION_MS = 3000;

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderNoiseControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;

  /** @type {import('./mic.js').Mic | null} */
  let mic = null;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let loop;
  let level = 0;
  /** @type {number[] | null} Mostres del calibratge en curs (només en memòria). */
  let calibrating = null;

  const toggleBtn = button({
    label: t('noise.start'),
    icon: 'mic',
    variant: 'primary',
    onClick: () => (mic ? stop() : start()),
  });
  const calibrateBtn = button({
    label: t('noise.calibrate'),
    icon: 'reset',
    onClick: () => {
      calibrating = [];
      calibrateBtn.disabled = true;
      ui?.announce(t('noise.calibrating'));
    },
  });
  const status = h('p', { class: 'noise-status', role: 'status' });
  const meterFill = h('div', { class: 'noise-mini__fill' });
  const meterText = h('p', { class: 'noise-mini__text' });
  const meter = h(
    'div',
    { class: 'noise-mini', 'aria-hidden': 'true' },
    h('div', { class: 'noise-mini__bar' }, meterFill),
    meterText,
  );

  // Indicador permanent mentre el micròfon és actiu, sigui quina sigui la pestanya.
  const indicator = h(
    'div',
    { class: 'mic-indicator', role: 'status' },
    icon('mic'),
    h('span', null, t('noise.micActive')),
    button({ label: t('noise.stop'), variant: 'ghost', onClick: () => stop() }),
  );

  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.noise ?? {},
    t,
    onChange: (patch) =>
      dispatch({ module: 'core', type: 'setModuleConfig', payload: { moduleId: 'noise', patch } }),
  });

  el.append(
    h('p', { class: 'muted' }, t('noise.help')),
    h('p', { class: 'callout' }, t('noise.privacy')),
    h('div', { class: 'btn-row btn-row--wrap' }, toggleBtn, calibrateBtn),
    status,
    meter,
    h(
      'details',
      { class: 'pane__config' },
      h('summary', null, t('common.displayOptions')),
      configForm.el,
    ),
  );

  const sample = () => {
    if (!mic) return;
    const db = mic.readDb();
    if (calibrating) {
      calibrating.push(db);
      if (calibrating.length * SAMPLE_MS >= CALIBRATION_MS) {
        const quietDb = calibrating.reduce((a, b) => a + b, 0) / calibrating.length;
        calibrating = null;
        calibrateBtn.disabled = false;
        dispatch({ type: 'calibrate', payload: { quietDb } });
        ui?.announce(t('noise.calibrated'));
      }
    }
    const state = ctx.getState();
    /** @type {NoiseState | undefined} */
    const s = state.live.modules.noise;
    const sensitivity = Number(state.live.config.noise?.sensitivity ?? 3);
    level = smooth(level, dbToLevel(db, s?.quietDb ?? null, sensitivity));
    const rounded = Math.round(level * 20) / 20;
    ui?.publish('noise', { active: true, level: rounded });
    meterFill.style.setProperty('--level', String(rounded / 4.5));
    meterText.textContent = t(voiceKey(Math.min(4, Math.floor(rounded))));
  };

  async function start() {
    if (mic) return;
    try {
      mic = await startMic();
    } catch {
      mic = null;
      ui?.announce(t('noise.error'));
      status.textContent = t('noise.error');
      return;
    }
    level = 0;
    loop = setInterval(sample, SAMPLE_MS);
    document.body.append(indicator);
    // El sonòmetre es mostra a la pantalla mentre escolta (i s'apaga en sortir-ne).
    dispatch({ module: 'core', type: 'setStage', payload: { id: 'noise' } });
    refresh();
  }

  function stop() {
    if (!mic) return;
    clearInterval(loop);
    mic.stop();
    mic = null;
    calibrating = null;
    level = 0;
    indicator.remove();
    ui?.publish('noise', { active: false, level: 0 });
    ui?.announce(t('noise.stopped'));
    refresh();
  }

  function refresh() {
    const active = mic !== null;
    setButton(toggleBtn, {
      label: active ? t('noise.stop') : t('noise.start'),
      icon: active ? 'micOff' : 'mic',
    });
    toggleBtn.setAttribute('aria-pressed', String(active));
    calibrateBtn.disabled = !active || calibrating !== null;
    meter.hidden = !active;
    const s = ctx.getState().live.modules.noise;
    status.textContent = active
      ? s?.quietDb == null
        ? t('noise.activeUncalibrated')
        : t('noise.active')
      : t('noise.inactive');
  }

  const onHide = () => stop();
  window.addEventListener('pagehide', onHide);
  refresh();

  return {
    update(state) {
      configForm.update(state.live.config.noise ?? {});
      // En sortir del mòdul (un altre mòdul a l'escenari), el micròfon s'apaga.
      if (mic && state.live.stage !== 'noise') stop();
      else refresh();
    },
    destroy() {
      stop();
      window.removeEventListener('pagehide', onHide);
      el.replaceChildren();
    },
  };
}
