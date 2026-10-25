// @ts-check
// Mòdul 1 · Agenda visual del dia.
// Seqüència d'activitats amb pictograma i text, estats fet / ara / després i
// targetes de canvi per anunciar imprevistos.

import { agendaActions, initialAgenda, sanitizeContent, sanitizeState } from './logic.js';
import { renderAgendaControl } from './control.js';
import { renderAgendaProjection } from './projection.js';
import './agenda.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'view',
    type: 'select',
    labelKey: 'agenda.config.view',
    hintKey: 'agenda.config.viewHint',
    options: [
      { value: 'all', labelKey: 'agenda.config.viewAll' },
      { value: 'focus', labelKey: 'agenda.config.viewFocus' },
    ],
  },
  {
    key: 'timeBar',
    type: 'select',
    labelKey: 'agenda.config.timeBar',
    hintKey: 'agenda.config.timeBarHint',
    options: [
      { value: 'none', labelKey: 'agenda.config.timeBarNone' },
      { value: 'bar', labelKey: 'agenda.config.timeBarBar' },
      { value: 'minutes', labelKey: 'agenda.config.timeBarMinutes' },
    ],
  },
  {
    key: 'timeBarScope',
    type: 'select',
    labelKey: 'agenda.config.timeBarScope',
    hintKey: 'agenda.config.timeBarScopeHint',
    options: [
      { value: 'all', labelKey: 'agenda.config.timeBarScopeAll' },
      { value: 'current', labelKey: 'agenda.config.timeBarScopeCurrent' },
    ],
  },
];

/** @type {import('../../core/types.js').TeappModule} */
const agenda = {
  id: 'agenda',
  version: 1,
  nameKey: 'agenda.name',
  icon: 'list',
  region: 'stage',
  configSchema,
  defaults: () => ({ view: 'all', timeBar: 'none', timeBarScope: 'all' }),
  initialState: (_config, content) => initialAgenda(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ activities: state.activities }),
  actions: agendaActions,
  keys: [
    { keys: ['ArrowRight', 'PageDown'], action: 'next', descKey: 'keys.next' },
    { keys: ['ArrowLeft', 'PageUp'], action: 'prev', descKey: 'keys.prev' },
  ],
  renderControl: (el, ctx) => renderAgendaControl(el, ctx, configSchema),
  renderProjection: renderAgendaProjection,
};

export default agenda;
