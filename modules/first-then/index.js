// @ts-check
// Mòdul 3 · Primer → Després.

import { firstThenActions, initialFirstThen, sanitizeContent, sanitizeState } from './logic.js';
import { renderFirstThenControl } from './control.js';
import { renderFirstThenProjection } from './projection.js';
import './first-then.css';

/** @type {import('../../core/types.js').TeappModule} */
const firstThen = {
  id: 'firstThen',
  version: 1,
  nameKey: 'firstThen.name',
  icon: 'columns',
  region: 'stage',
  configSchema: [],
  defaults: () => ({}),
  initialState: (_config, content) => initialFirstThen(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ first: state.first, then: state.then }),
  actions: firstThenActions,
  renderControl: renderFirstThenControl,
  renderProjection: renderFirstThenProjection,
};

export default firstThen;
