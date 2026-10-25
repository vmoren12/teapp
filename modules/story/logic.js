// @ts-check
// Lògica pura de les històries socials: seqüències breus de vinyetes
// (pictograma o imatge pròpia + frase), segons les pautes de Carol Gray.
// Cada frase té un tipus perquè el panell pugui recordar la proporció
// recomanada: més frases descriptives que directives.

import { clamp, cleanText, isObject, sanitizePictoRef } from '../../core/schema/validate.js';
import {
  insertItem,
  isId,
  moveItem,
  patchItem,
  removeItem,
  sanitizeList,
} from '../shared/items.js';

/** @typedef {import('../../core/types.js').Reducer} Reducer */
/** @typedef {import('../../core/types.js').PictoRef} PictoRef */

/**
 * Tipus de frase (Carol Gray): descriptiva (fets), de perspectiva (què pensen
 * o senten les persones), directiva (què podem fer) i afirmativa (valor compartit).
 * @typedef {'descriptive' | 'perspective' | 'directive' | 'affirmative'} SentenceKind
 */

/**
 * @typedef {Object} Panel
 * @property {string} id
 * @property {string} label    La frase.
 * @property {PictoRef | null} picto
 * @property {SentenceKind} kind
 */

/**
 * @typedef {Object} Story
 * @property {string} id
 * @property {string} title
 * @property {Panel[]} panels
 */

/**
 * @typedef {Object} StoryState
 * @property {Story[]} stories
 * @property {string | null} currentId  Història que es mostra.
 * @property {number} index             Vinyeta actual.
 */

export const KINDS = /** @type {const} */ ([
  'descriptive',
  'perspective',
  'directive',
  'affirmative',
]);
export const MAX_STORIES = 20;
export const MAX_PANELS = 10;
export const MAX_TEXT = 140;

/** @param {unknown} input @returns {Panel | null} */
export function sanitizePanel(input) {
  if (!isObject(input) || !isId(input.id)) return null;
  return {
    id: input.id,
    label: cleanText(input.label, MAX_TEXT),
    picto: sanitizePictoRef(input.picto),
    kind: KINDS.includes(input.kind) ? input.kind : 'descriptive',
  };
}

/** @param {unknown} input @returns {Story | null} */
export function sanitizeStory(input) {
  if (!isObject(input) || !isId(input.id)) return null;
  return {
    id: input.id,
    title: cleanText(input.title, 60),
    panels: sanitizeList(input.panels, sanitizePanel, MAX_PANELS),
  };
}

/** @param {unknown} content @returns {{ stories: Story[] }} */
export function sanitizeContent(content) {
  const c = isObject(content) ? content : {};
  return { stories: sanitizeList(c.stories, sanitizeStory, MAX_STORIES) };
}

/** @param {unknown} content @returns {StoryState} */
export function initialStory(content) {
  const { stories } = sanitizeContent(content);
  return { stories, currentId: stories[0]?.id ?? null, index: 0 };
}

/** @param {unknown} input @returns {StoryState} */
export function sanitizeState(input) {
  const s = isObject(input) ? input : {};
  const { stories } = sanitizeContent(s);
  const currentId = stories.some((st) => st.id === s.currentId)
    ? s.currentId
    : (stories[0]?.id ?? null);
  return {
    stories,
    currentId,
    index: Number.isInteger(s.index) ? Math.max(0, s.index) : 0,
  };
}

/** @param {StoryState} s @returns {Story | null} */
export const currentStory = (s) => s.stories.find((st) => st.id === s.currentId) ?? null;

/** Vinyeta actual (dins dels límits). @param {StoryState} s */
export function currentIndex(s) {
  const story = currentStory(s);
  return story ? clamp(s.index, 0, Math.max(0, story.panels.length - 1)) : 0;
}

/**
 * Comptatge per tipus de frase i si es compleix la proporció recomanada (com a
 * mínim dues frases descriptives, de perspectiva o afirmatives per cada directiva).
 * @param {Panel[]} panels
 */
export function sentenceBalance(panels) {
  const directive = panels.filter((p) => p.kind === 'directive').length;
  const others = panels.length - directive;
  return { directive, others, balanced: directive === 0 || others >= directive * 2 };
}

/**
 * @param {StoryState} s @param {unknown} storyId @param {(story: Story) => Story} fn
 * @returns {StoryState}
 */
function editStory(s, storyId, fn) {
  const index = s.stories.findIndex((st) => st.id === storyId);
  if (index < 0) return s;
  const next = fn(s.stories[index]);
  if (next === s.stories[index]) return s;
  const stories = s.stories.slice();
  stories[index] = next;
  return { ...s, stories };
}

/** @param {StoryState} s @param {(index: number, count: number) => number} fn */
function moveTo(s, fn) {
  const story = currentStory(s);
  if (!story) return s;
  const i = currentIndex(s);
  const next = clamp(fn(i, story.panels.length), 0, Math.max(0, story.panels.length - 1));
  return next === s.index ? s : { ...s, index: next };
}

/** @type {Record<string, Reducer>} */
export const storyActions = {
  next: (/** @type {StoryState} */ s) => moveTo(s, (i) => i + 1),
  prev: (/** @type {StoryState} */ s) => moveTo(s, (i) => i - 1),
  goTo: (/** @type {StoryState} */ s, p) =>
    Number.isInteger(p?.index) ? moveTo(s, () => p.index) : s,
  select: (/** @type {StoryState} */ s, p) =>
    s.stories.some((st) => st.id === p?.id) && p.id !== s.currentId
      ? { ...s, currentId: p.id, index: 0 }
      : s,
  /** Afegeix una història (buida o d'exemple, ja traduïda al panell) i la mostra. */
  addStory: (/** @type {StoryState} */ s, p) => {
    const story = sanitizeStory(p?.story);
    const stories = insertItem(s.stories, story, MAX_STORIES);
    if (stories === s.stories || !story) return s;
    return { stories, currentId: story.id, index: 0 };
  },
  setTitle: (/** @type {StoryState} */ s, p) =>
    editStory(s, p?.id, (st) => ({ ...st, title: cleanText(p?.title, 60) })),
  removeStory: (/** @type {StoryState} */ s, p) => {
    const stories = removeItem(s.stories, p?.id);
    if (stories === s.stories) return s;
    const currentId = s.currentId === p.id ? (stories[0]?.id ?? null) : s.currentId;
    return { stories, currentId, index: s.currentId === p.id ? 0 : s.index };
  },
  addPanel: (/** @type {StoryState} */ s, p) =>
    editStory(s, p?.storyId, (st) => {
      const panels = insertItem(st.panels, sanitizePanel(p?.panel), MAX_PANELS);
      return panels === st.panels ? st : { ...st, panels };
    }),
  updatePanel: (/** @type {StoryState} */ s, p) =>
    editStory(s, p?.storyId, (st) => {
      const panels = patchItem(st.panels, p?.id, p?.patch, sanitizePanel);
      return panels === st.panels ? st : { ...st, panels };
    }),
  movePanel: (/** @type {StoryState} */ s, p) =>
    editStory(s, p?.storyId, (st) => {
      const panels = moveItem(st.panels, p?.id, p?.delta);
      return panels === st.panels ? st : { ...st, panels };
    }),
  removePanel: (/** @type {StoryState} */ s, p) =>
    editStory(s, p?.storyId, (st) => {
      const panels = removeItem(st.panels, p?.id);
      return panels === st.panels ? st : { ...st, panels };
    }),
};

/**
 * Històries d'exemple. Els textos són a l'idioma (`story.examples.<id>.…`) i
 * estan escrites per al grup, mai per a un alumne concret.
 * [tipus de frase, pictograma del paquet inicial] per a cada vinyeta.
 * @type {Record<string, [SentenceKind, string][]>}
 */
export const EXAMPLES = {
  substitute: [
    ['descriptive', 'casa'],
    ['descriptive', 'professor'],
    ['perspective', 'pensar'],
    ['descriptive', 'agenda'],
    ['directive', 'preguntar'],
    ['affirmative', 'rellotge'],
  ],
  fireDrill: [
    ['descriptive', 'canvi'],
    ['descriptive', 'escoltar'],
    ['perspective', 'silenci'],
    ['directive', 'companys'],
    ['descriptive', 'esperar'],
    ['affirmative', 'agenda'],
  ],
  outing: [
    ['descriptive', 'excursio'],
    ['descriptive', 'autobus'],
    ['perspective', 'escoltar'],
    ['directive', 'companys'],
    ['affirmative', 'entrar'],
  ],
};
