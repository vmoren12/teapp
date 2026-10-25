// @ts-check
// Mòdul 2 · Temporitzador visual.

import { initialTimer, isRunning, remaining, sanitizeState, timerActions } from './logic.js';
import { renderTimerControl } from './control.js';
import { renderTimerProjection } from './projection.js';
import './timer.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'shape',
    type: 'select',
    labelKey: 'timer.config.shape',
    options: [
      { value: 'disc', labelKey: 'timer.config.disc' },
      { value: 'bar', labelKey: 'timer.config.bar' },
    ],
  },
  {
    key: 'digits',
    type: 'select',
    labelKey: 'timer.config.digits',
    hintKey: 'timer.config.digitsHint',
    options: [
      { value: 'minutes', labelKey: 'timer.config.digitsMinutes' },
      { value: 'mmss', labelKey: 'timer.config.digitsClock' },
      { value: 'none', labelKey: 'timer.config.digitsNone' },
    ],
  },
  { key: 'sound', type: 'boolean', labelKey: 'timer.config.sound' },
];

/** @type {import('../../core/types.js').TeappModule} */
const timer = {
  id: 'timer',
  version: 1,
  nameKey: 'timer.name',
  icon: 'timer',
  region: 'stage',
  configSchema,
  defaults: () => ({ shape: 'disc', digits: 'minutes', sound: true }),
  initialState: () => initialTimer(),
  sanitizeState,
  actions: timerActions,
  keys: [{ keys: [' '], action: 'toggle', descKey: 'keys.timer' }],
  renderControl: (el, ctx) => renderTimerControl(el, ctx, configSchema),
  renderProjection: renderTimerProjection,
  // So suau quan s'acaba el temps (una sola vegada, des del panell de control).
  onTick(ctx, state, now, memo) {
    const s = state.live.modules.timer;
    if (!s) return;
    const left = remaining(s, now);
    const running = isRunning(s);
    if (memo.wasCounting && running && left <= 0 && state.live.config.timer?.sound) {
      ctx.ui?.playSound('end');
    }
    memo.wasCounting = running && left > 0;
  },
};

export default timer;
