// @ts-check
// Mòdul 5 · Instruccions pas a pas.
// Seqüència de passos (pictograma + text curt) per a una tasca. Cada activitat
// de l'agenda pot tenir les seves; si no, es fan servir les generals.

import { initialSteps, sanitizeContent, sanitizeState, stepsActions } from './logic.js';
import { renderStepsControl } from './control.js';
import { renderStepsProjection } from './projection.js';
import './steps.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'view',
    type: 'select',
    labelKey: 'steps.config.view',
    options: [
      { value: 'single', labelKey: 'steps.config.viewSingle' },
      { value: 'list', labelKey: 'steps.config.viewList' },
    ],
  },
];

/** @type {import('../../core/types.js').TeappModule} */
const steps = {
  id: 'steps',
  version: 1,
  nameKey: 'steps.name',
  icon: 'steps',
  region: 'stage',
  configSchema,
  defaults: () => ({ view: 'single' }),
  initialState: (_config, content) => initialSteps(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ general: state.general, byActivity: state.byActivity }),
  actions: stepsActions,
  // Quan les instruccions són a l'escenari, les mateixes tecles que l'agenda
  // (fletxes, AvPàg/RePàg, comandament de presentació) passen els passos.
  keys: [
    { keys: ['ArrowRight', 'PageDown'], action: 'next', descKey: 'keys.stepsNext', when: 'stage' },
    { keys: ['ArrowLeft', 'PageUp'], action: 'prev', descKey: 'keys.stepsPrev', when: 'stage' },
  ],
  renderControl: (el, ctx) => renderStepsControl(el, ctx, configSchema),
  renderProjection: renderStepsProjection,
};

export default steps;
