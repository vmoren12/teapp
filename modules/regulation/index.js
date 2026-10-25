// @ts-check
// Mòdul 10 · Regulació: termòmetre emocional i respiració guiada.
// La respiració es pot llançar des de la pantalla de calma.

import {
  breathingPhase,
  initialRegulation,
  regulationActions,
  sanitizeContent,
  sanitizeState,
} from './logic.js';
import { renderRegulationControl } from './control.js';
import { renderRegulationProjection } from './projection.js';
import './regulation.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'pattern',
    type: 'select',
    labelKey: 'regulation.config.pattern',
    hintKey: 'regulation.config.patternHint',
    options: [
      { value: '4-6', labelKey: 'regulation.config.p46' },
      { value: '4-4-4', labelKey: 'regulation.config.p444' },
      { value: '5-5', labelKey: 'regulation.config.p55' },
      { value: '4-7-8', labelKey: 'regulation.config.p478' },
    ],
  },
  { key: 'sound', type: 'boolean', labelKey: 'regulation.config.sound' },
];

/** @type {import('../../core/types.js').TeappModule} */
const regulation = {
  id: 'regulation',
  version: 1,
  nameKey: 'regulation.name',
  icon: 'heart',
  region: 'stage',
  configSchema,
  // Sense so per defecte.
  defaults: () => ({ pattern: '4-6', sound: false }),
  initialState: (_config, content) => initialRegulation(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ levels: state.levels }),
  actions: regulationActions,
  calmLaunch: { labelKey: 'regulation.launchBreathing', icon: 'heart', action: 'startBreathing' },
  renderControl: (el, ctx) => renderRegulationControl(el, ctx, configSchema),
  renderProjection: renderRegulationProjection,
  // So opcional (molt suau) a cada canvi de fase, des del panell.
  onTick(ctx, state, now, memo) {
    const s = state.live.modules.regulation;
    const config = state.live.config.regulation ?? {};
    const on =
      s?.tool === 'breathing' && s.breathingSince !== null && state.live.stage === 'regulation';
    if (!on || !config.sound) {
      memo.phase = null;
      return;
    }
    const p = breathingPhase(String(config.pattern), now - s.breathingSince);
    const key = `${p.cycle}:${p.index}`;
    if (memo.phase !== null && memo.phase !== undefined && memo.phase !== key)
      ctx.ui?.playSound('soft');
    memo.phase = key;
  },
};

export default regulation;
