// @ts-check
// Mòdul 9 · Històries socials.
// Vinyetes breus per anticipar situacions noves o canvis («Avui tenim un
// substitut», «Simulacre d'incendi»). Es poden preparar abans, viatgen amb les
// plantilles (també a les exportacions) i se n'inclouen unes quantes d'exemple.

import { initialStory, sanitizeContent, sanitizeState, storyActions } from './logic.js';
import { renderStoryControl } from './control.js';
import { renderStoryProjection } from './projection.js';
import './story.css';

/** @type {import('../../core/types.js').ConfigField[]} */
const configSchema = [
  {
    key: 'view',
    type: 'select',
    labelKey: 'story.config.view',
    hintKey: 'story.config.viewHint',
    options: [
      { value: 'single', labelKey: 'story.config.viewSingle' },
      { value: 'sequence', labelKey: 'story.config.viewSequence' },
    ],
  },
  {
    key: 'screenControls',
    type: 'boolean',
    labelKey: 'story.config.screenControls',
    hintKey: 'story.config.screenControlsHint',
  },
];

/** @type {import('../../core/types.js').TeappModule} */
const story = {
  id: 'story',
  version: 1,
  nameKey: 'story.name',
  icon: 'story',
  region: 'stage',
  configSchema,
  defaults: () => ({ view: 'single', screenControls: true }),
  initialState: (_config, content) => initialStory(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ stories: state.stories }),
  actions: storyActions,
  keys: [
    { keys: ['ArrowRight', 'PageDown'], action: 'next', descKey: 'keys.storyNext', when: 'stage' },
    { keys: ['ArrowLeft', 'PageUp'], action: 'prev', descKey: 'keys.storyPrev', when: 'stage' },
  ],
  // Des de la pissarra (projecció o mode classe) es pot tocar una vinyeta per anar-hi.
  remoteActions: ['goTo'],
  renderControl: (el, ctx) => renderStoryControl(el, ctx, configSchema),
  renderProjection: renderStoryProjection,
};

export default story;
