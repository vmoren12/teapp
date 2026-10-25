// @ts-check
// Mòdul 9 · Històries socials.
// Vinyetes breus per anticipar situacions noves o canvis («Avui tenim un
// substitut», «Simulacre d'incendi»). Es poden preparar abans, viatgen amb les
// plantilles (també a les exportacions) i se n'inclouen unes quantes d'exemple.

import { initialStory, sanitizeContent, sanitizeState, storyActions } from './logic.js';
import { renderStoryControl } from './control.js';
import { renderStoryProjection } from './projection.js';
import './story.css';

/** @type {import('../../core/types.js').TeappModule} */
const story = {
  id: 'story',
  version: 1,
  nameKey: 'story.name',
  icon: 'story',
  region: 'stage',
  configSchema: [],
  defaults: () => ({}),
  initialState: (_config, content) => initialStory(content),
  sanitizeState,
  sanitizeContent,
  toTemplate: (state) => ({ stories: state.stories }),
  actions: storyActions,
  keys: [
    { keys: ['ArrowRight', 'PageDown'], action: 'next', descKey: 'keys.storyNext', when: 'stage' },
    { keys: ['ArrowLeft', 'PageUp'], action: 'prev', descKey: 'keys.storyPrev', when: 'stage' },
  ],
  renderControl: renderStoryControl,
  renderProjection: renderStoryProjection,
};

export default story;
