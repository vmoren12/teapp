// @ts-check
// Mòdul 7 · Sonòmetre de grup.
// Indicador visual del nivell de soroll de TOTA l'aula amb l'escala de veu 0–4.
// L'àudio es processa al navegador (AnalyserNode) i només se'n calcula el volum.

import { initialNoise, noiseActions, sanitizeState } from './logic.js';
import { renderNoiseControl } from './control.js';
import { renderNoiseProjection } from './projection.js';
import './noise.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'limit',
    type: 'select',
    labelKey: 'noise.config.limit',
    hintKey: 'noise.config.limitHint',
    options: [
      { value: 'auto', labelKey: 'noise.config.limitAuto' },
      ...[0, 1, 2, 3, 4].map((value) => ({ value, labelKey: `voice.l${value}` })),
    ],
  },
  {
    key: 'sensitivity',
    type: 'select',
    labelKey: 'noise.config.sensitivity',
    hintKey: 'noise.config.sensitivityHint',
    options: [1, 2, 3, 4, 5].map((value) => ({ value, labelKey: `noise.config.s${value}` })),
  },
];

/** @type {import('../../core/types.js').TeappModule} */
const noise = {
  id: 'noise',
  version: 1,
  nameKey: 'noise.name',
  icon: 'mic',
  region: 'stage',
  configSchema,
  defaults: () => ({ limit: 'auto', sensitivity: 3 }),
  initialState: () => initialNoise(),
  sanitizeState,
  actions: noiseActions,
  renderControl: (el, ctx) => renderNoiseControl(el, ctx, configSchema),
  renderProjection: renderNoiseProjection,
};

export default noise;
