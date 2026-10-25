// @ts-check
// Panell de control del temporitzador.

import { h } from '../../core/dom.js';
import { formatClock } from '../../core/clock.js';
import { button, setButton } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { createConfigForm } from '../../components/config-form.js';
import { isLinked, isRunning, PRESETS, remaining, timerView } from './logic.js';
import { currentActivity, getAgenda } from '../agenda/selectors.js';

/** @typedef {import('./logic.js').TimerState} TimerState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderTimerControl(el, ctx, schema) {
  const { t, dispatch } = ctx;

  const clock = h('p', { class: 'timer-readout__clock' });
  const state = h('p', { class: 'timer-readout__state' });

  const toggleBtn = button({
    label: t('timer.start'),
    icon: 'play',
    variant: 'primary',
    kbd: t('keys.spaceKey'),
    onClick: () => dispatch({ type: 'toggle' }),
  });
  const resetBtn = button({
    label: t('timer.reset'),
    icon: 'reset',
    onClick: () => dispatch({ type: 'reset' }),
  });
  const addBtn = button({
    label: t('timer.addMinute'),
    icon: 'plus',
    onClick: () => dispatch({ type: 'add', payload: { minutes: 1 } }),
  });

  const presets = PRESETS.map((minutes) =>
    button({
      label: t('timer.preset', { minutes }),
      className: 'btn--chip',
      onClick: () => dispatch({ type: 'set', payload: { minutes } }),
    }),
  );

  const custom = h('input', {
    type: 'number',
    class: 'input input--number',
    min: 1,
    max: 180,
    step: 1,
    inputmode: 'numeric',
    id: 'timer-custom',
  });
  const customForm = h(
    'form',
    {
      class: 'inline-form',
      onSubmit: (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        const minutes = Number(custom.value);
        if (Number.isFinite(minutes) && minutes > 0)
          dispatch({ type: 'set', payload: { minutes } });
      },
    },
    h('label', { for: 'timer-custom', class: 'field__label' }, t('timer.customLabel')),
    custom,
    h('button', { type: 'submit', class: 'btn' }, t('timer.apply')),
  );

  const fromActivityBtn = button({
    label: t('timer.fromActivity'),
    icon: 'link',
    onClick: () => {
      dispatch({ type: 'fromActivity' });
      ctx.ui?.announce(t('timer.linkedNotice'));
    },
  });

  // Estat del vincle amb l'agenda: «Lligat a: …» i botó per deslligar-lo.
  const linkText = h('p', { class: 'timer-link__text' });
  const unlinkBtn = button({
    label: t('timer.unlink'),
    icon: 'unlink',
    variant: 'ghost',
    onClick: () => {
      dispatch({ type: 'unlink' });
      ctx.ui?.announce(t('timer.unlinkedNotice'));
    },
  });
  const linkBox = h(
    'div',
    { class: 'timer-link', role: 'status' },
    h('span', { class: 'timer-link__icon', 'aria-hidden': 'true' }, icon('link')),
    linkText,
    unlinkBtn,
  );

  const labelInput = h('input', {
    type: 'text',
    class: 'input',
    id: 'timer-label',
    maxlength: 80,
    placeholder: t('timer.labelPlaceholder'),
  });
  labelInput.addEventListener('input', () =>
    dispatch({ type: 'setLabel', payload: { label: labelInput.value } }),
  );

  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.timer ?? {},
    t,
    onChange: (patch) =>
      dispatch({ module: 'core', type: 'setModuleConfig', payload: { moduleId: 'timer', patch } }),
  });

  el.append(
    h('div', { class: 'timer-readout', 'aria-live': 'off' }, clock, state),
    linkBox,
    h('div', { class: 'btn-row' }, toggleBtn, resetBtn, addBtn),
    h(
      'fieldset',
      { class: 'field' },
      h('legend', { class: 'field__label' }, t('timer.duration')),
      h('div', { class: 'btn-row btn-row--wrap' }, presets),
      customForm,
      fromActivityBtn,
    ),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'timer-label', class: 'field__label' }, t('timer.label')),
      labelInput,
    ),
    h(
      'details',
      { class: 'pane__config' },
      h('summary', null, t('common.displayOptions')),
      configForm.el,
    ),
  );

  /** @type {import('./logic.js').TimerView | null} */
  let timer = null;
  let lastClock = '';
  let lastRunning = /** @type {boolean | null} */ (null);

  /** @param {number} now */
  function tick(now) {
    if (!timer) return;
    const left = remaining(timer, now);
    const text = formatClock(left);
    if (text !== lastClock) {
      lastClock = text;
      clock.textContent = text;
    }
    const running = isRunning(timer) && left > 0;
    state.textContent =
      left <= 0 ? t('timer.finished') : running ? t('timer.running') : t('timer.paused');
    if (running !== lastRunning) {
      lastRunning = running;
      setButton(toggleBtn, {
        label: running ? t('timer.pause') : t('timer.start'),
        icon: running ? 'pause' : 'play',
      });
    }
  }

  return {
    update(shared) {
      /** @type {TimerState | undefined} */
      const s = shared.live.modules.timer;
      timer = s ? timerView(s, shared.live) : null;
      configForm.update(shared.live.config.timer ?? {});
      if (s && document.activeElement !== labelInput) labelInput.value = s.label;
      if (timer && document.activeElement !== custom)
        custom.value = String(Math.round(timer.totalMs / 60000) || 1);
      const agenda = getAgenda(shared.live);
      const linked = s ? isLinked(s) : false;
      linkBox.hidden = !linked;
      if (linked) {
        const name = timer?.activity?.label || t('agenda.untitled');
        linkText.textContent = timer?.activity
          ? t('timer.linkedTo', { name })
          : t('timer.linkedFinished');
      }
      fromActivityBtn.disabled = !agenda || !currentActivity(agenda) || linked;
      labelInput.placeholder =
        linked && timer?.activity ? timer.activity.label : t('timer.labelPlaceholder');
      lastRunning = null;
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
