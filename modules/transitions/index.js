// @ts-check
// Mòdul 4 · Avisos de transició (vinculats a l'agenda).

import { getAgenda } from '../agenda/selectors.js';
import { computeWarning, warningKey } from './logic.js';
import { renderTransitionsControl } from './control.js';
import { renderTransitionsProjection } from './projection.js';
import './transitions.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  { key: 'enabled', type: 'boolean', labelKey: 'transitions.config.enabled' },
  {
    key: 'minutes',
    type: 'numbers',
    labelKey: 'transitions.config.minutes',
    options: [10, 5, 3, 2, 1].map((value) => ({ value, labelKey: `transitions.config.m${value}` })),
  },
  { key: 'sound', type: 'boolean', labelKey: 'transitions.config.sound' },
];

/** @type {import('../../core/types.js').TeappModule} */
const transitions = {
  id: 'transitions',
  version: 1,
  nameKey: 'transitions.name',
  icon: 'bell',
  region: 'footer',
  configSchema,
  defaults: () => ({ enabled: true, minutes: [5, 2, 1], sound: true }),
  initialState: () => ({}),
  actions: {},
  renderControl: (el, ctx) => renderTransitionsControl(el, ctx, configSchema),
  renderProjection: renderTransitionsProjection,
  // Fa sonar l'avís un sol cop per llindar. En carregar la pàgina no sona
  // (només es memoritza l'estat actual) per evitar sorpreses en recarregar.
  onTick(ctx, state, now, memo) {
    const agenda = getAgenda(state.live);
    const config = state.live.config.transitions ?? {};
    const warning = computeWarning(agenda, config, now);
    const key = warningKey(agenda, warning);
    if (memo.ready && key && key !== memo.key && config.sound && warning) {
      ctx.ui?.playSound(warning.kind === 'due' ? 'end' : 'warning');
    }
    memo.key = key;
    memo.ready = true;
  },
};

export default transitions;
