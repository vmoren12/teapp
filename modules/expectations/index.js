// @ts-check
// Mòdul 6 · Expectatives de l'activitat.
// Tauler fix de quatre preguntes amb pictograma i resposta curta. Cada activitat
// de l'agenda pot tenir el seu; si no, es fa servir el general.

import { expectationsActions, sanitizeContent } from './logic.js';
import { renderExpectationsControl } from './control.js';
import { renderExpectationsProjection } from './projection.js';
import './expectations.css';

/** @type {import('../../core/types.js').TeappModule} */
const expectations = {
  id: 'expectations',
  version: 1,
  nameKey: 'expectations.name',
  icon: 'board',
  region: 'stage',
  configSchema: [],
  defaults: () => ({}),
  initialState: (_config, content) => sanitizeContent(content),
  sanitizeState: (state) => sanitizeContent(state),
  sanitizeContent,
  toTemplate: (state) => ({ general: state.general, byActivity: state.byActivity }),
  actions: expectationsActions,
  renderControl: renderExpectationsControl,
  renderProjection: renderExpectationsProjection,
};

export default expectations;
