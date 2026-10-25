// @ts-check
// Mòdul 11 · Tauler d'elecció.
// De 2 a 6 opcions amb pictograma (activitats, materials o descansos).

import { choiceActions, initialChoice, sanitizeContent, sanitizeState } from './logic.js';
import { renderChoiceControl } from './control.js';
import { renderChoiceProjection } from './projection.js';
import './choice.css';

/** @type {import('../../core/types.js').TeappModule} */
const choice = {
  id: 'choice',
  version: 1,
  nameKey: 'choice.name',
  icon: 'choice',
  region: 'stage',
  configSchema: [],
  defaults: () => ({}),
  initialState: (_config, content) => initialChoice(content),
  sanitizeState,
  sanitizeContent,
  // La tria del grup no es desa a la plantilla: només les opcions.
  toTemplate: (state) => ({ title: state.title, options: state.options }),
  actions: choiceActions,
  renderControl: renderChoiceControl,
  renderProjection: renderChoiceProjection,
};

export default choice;
