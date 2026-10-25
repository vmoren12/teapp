// @ts-check
// Mòdul 8 · Torns previsibles.
// Qui té el torn ara i després, en un ordre fix i visible. Els noms només es
// desen en local i, per defecte, no surten mai a les exportacions.

import { initialFromContent, sanitizeContent, sanitizeState, turnsActions } from './logic.js';
import { renderTurnsControl } from './control.js';
import { renderTurnsProjection } from './projection.js';
import './turns.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'hideNames',
    type: 'boolean',
    labelKey: 'turns.config.hideNames',
    hintKey: 'turns.config.hideNamesHint',
  },
  { key: 'showOrder', type: 'boolean', labelKey: 'turns.config.showOrder' },
];

/** @type {import('../../core/types.js').TeappModule} */
const turns = {
  id: 'turns',
  version: 1,
  nameKey: 'turns.name',
  icon: 'people',
  region: 'stage',
  configSchema,
  defaults: () => ({ hideNames: false, showOrder: true }),
  initialState: (_config, content) => initialFromContent(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ kind: state.kind, names: state.names, count: state.count }),
  // Privadesa per defecte: els noms no s'exporten si el docent no ho marca.
  exportContent: (content) => ({ ...sanitizeContent(content), names: [] }),
  actions: turnsActions,
  keys: [
    { keys: ['ArrowRight', 'PageDown'], action: 'next', descKey: 'keys.turnsNext', when: 'stage' },
    { keys: ['ArrowLeft', 'PageUp'], action: 'prev', descKey: 'keys.turnsPrev', when: 'stage' },
  ],
  renderControl: (el, ctx) => renderTurnsControl(el, ctx, configSchema),
  renderProjection: renderTurnsProjection,
};

export default turns;
