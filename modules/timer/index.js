// @ts-check
// Mòdul 2 · Temporitzador visual.

import {
  initialTimer,
  isLinked,
  isRunning,
  remaining,
  sanitizeState,
  timerActions,
  timerView,
} from './logic.js';
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
  // Des del panell de control: so suau quan s'acaba el temps (una sola vegada)
  // i manteniment del vincle amb l'agenda.
  onTick(ctx, state, now, memo) {
    const s = state.live.modules.timer;
    if (!s) return;
    const view = timerView(s, state.live);
    const left = remaining(view, now);
    const running = isRunning(view);
    // Si està lligat, el final del temps és el final de l'activitat: si els avisos
    // de transició ja hi fan sonar el seu so, no el repetim.
    const transitions = state.live.config.transitions ?? {};
    const covered =
      view.activity !== null && transitions.enabled !== false && transitions.sound === true;
    if (memo.wasCounting && running && left <= 0 && state.live.config.timer?.sound && !covered) {
      ctx.ui?.playSound('end');
    }
    memo.wasCounting = running && left > 0;

    if (!isLinked(s)) return;
    if (view.orphan) {
      // L'activitat lligada s'ha esborrat: es deslliga en pausa amb el darrer temps conegut.
      ctx.dispatch({ type: 'follow', payload: { remainingMs: memo.lastLeft ?? s.remainingMs } });
    } else {
      memo.lastLeft = left;
      // L'agenda ha passat a una altra activitat: el vincle la segueix.
      if (view.activity && view.activity.id !== s.linkedActivityId)
        ctx.dispatch({ type: 'follow' });
    }
  },
};

export default timer;
