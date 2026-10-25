// @ts-check
// Panell de control de les històries socials.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { confirmDialog } from '../../components/dialog.js';
import { createItemListEditor } from '../../components/item-list-editor.js';
import {
  currentIndex,
  currentStory,
  EXAMPLES,
  KINDS,
  MAX_PANELS,
  MAX_STORIES,
  MAX_TEXT,
  sentenceBalance,
} from './logic.js';

/** @typedef {import('./logic.js').StoryState} StoryState */
/** @typedef {import('./logic.js').Panel} Panel */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderStoryControl(el, ctx) {
  const { t, dispatch, ui } = ctx;
  /** @returns {StoryState | undefined} */
  const story = () => ctx.getState().live.modules.story;
  const storyId = () => story()?.currentId ?? null;

  // --- Tria i creació d'històries ----------------------------------------------------
  const select = h('select', { id: 'story-select', class: 'input' });
  select.addEventListener('change', () =>
    dispatch({ type: 'select', payload: { id: select.value } }),
  );

  const newBtn = button({
    label: t('story.new'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      dispatch({
        type: 'addStory',
        payload: { story: { id: ui.newId(), title: t('story.untitled'), panels: [] } },
      });
      titleInput.focus();
      titleInput.select();
    },
  });

  const exampleSelect = h(
    'select',
    { id: 'story-example', class: 'input' },
    Object.keys(EXAMPLES).map((key) =>
      h('option', { value: key }, t(`story.examples.${key}.title`)),
    ),
  );
  const exampleBtn = button({
    label: t('story.addExample'),
    icon: 'templates',
    onClick: () => {
      if (!ui) return;
      const key = exampleSelect.value;
      const rows = EXAMPLES[key] ?? [];
      dispatch({
        type: 'addStory',
        payload: {
          story: {
            id: ui.newId(),
            title: t(`story.examples.${key}.title`),
            panels: rows.map(([kind, pictoKey], i) => {
              const label = t(`story.examples.${key}.p${i + 1}`);
              const id = ctx.pictos.starterId(pictoKey);
              return {
                id: ui.newId(),
                label,
                kind,
                picto: id ? { source: 'arasaac', id, alt: label } : null,
              };
            }),
          },
        },
      });
      ui.announce(t('story.exampleAdded', { name: t(`story.examples.${key}.title`) }));
    },
  });

  const titleInput = h('input', { type: 'text', id: 'story-title', class: 'input', maxlength: 60 });
  titleInput.addEventListener('input', () =>
    dispatch({ type: 'setTitle', payload: { id: storyId(), title: titleInput.value } }),
  );
  const removeBtn = button({
    label: t('story.remove'),
    icon: 'trash',
    variant: 'ghost',
    onClick: async () => {
      const current = story() && currentStory(/** @type {StoryState} */ (story()));
      if (!current) return;
      const name = current.title || t('story.untitled');
      const ok = await confirmDialog({
        t,
        title: t('story.removeTitle'),
        message: t('story.removeConfirm', { name }),
        confirmLabel: t('common.delete'),
        danger: true,
      });
      if (ok) dispatch({ type: 'removeStory', payload: { id: current.id } });
    },
  });

  // --- Vinyetes -----------------------------------------------------------------------
  const editor = createItemListEditor({
    t,
    ui,
    label: t('story.panelsLabel'),
    itemLabel: (n) => t('story.panelLabel', { n }),
    placeholder: t('story.panelPlaceholder'),
    untitled: t('story.panelUntitled'),
    maxLength: MAX_TEXT,
    onPatch: (id, patch) =>
      dispatch({ type: 'updatePanel', payload: { storyId: storyId(), id, patch } }),
    onMove: (id, delta) =>
      dispatch({ type: 'movePanel', payload: { storyId: storyId(), id, delta } }),
    onRemove: (id) => dispatch({ type: 'removePanel', payload: { storyId: storyId(), id } }),
    // Tipus de frase de cada vinyeta.
    extra: (/** @type {Panel} */ panel) => {
      const kindSelect = h(
        'select',
        { class: 'input input--small', 'aria-label': t('story.kindLabel') },
        KINDS.map((kind) => h('option', { value: kind }, t(`story.kinds.${kind}`))),
      );
      let id = panel.id;
      kindSelect.addEventListener('change', () =>
        dispatch({
          type: 'updatePanel',
          payload: { storyId: storyId(), id, patch: { kind: kindSelect.value } },
        }),
      );
      return {
        el: kindSelect,
        update(/** @type {Panel} */ next) {
          id = next.id;
          kindSelect.value = next.kind;
        },
      };
    },
  });
  const addPanelBtn = button({
    label: t('story.addPanel'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      const id = ui.newId();
      dispatch({
        type: 'addPanel',
        payload: { storyId: storyId(), panel: { id, label: '', picto: null, kind: 'descriptive' } },
      });
      editor.focus(id);
    },
  });
  const balance = h('p', { class: 'field__hint story-balance' });
  const status = h('p', { class: 'callout' });
  const prevBtn = button({
    label: t('story.prev'),
    icon: 'prev',
    onClick: () => dispatch({ type: 'prev' }),
  });
  const nextBtn = button({
    label: t('story.next'),
    icon: 'next',
    variant: 'primary',
    onClick: () => dispatch({ type: 'next' }),
  });
  const emptyPanels = h('p', { class: 'empty' }, t('story.emptyPanels'));

  const storyArea = h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'story-title', class: 'field__label' }, t('story.title')),
      titleInput,
    ),
    status,
    h('div', { class: 'btn-row' }, prevBtn, nextBtn),
    editor.el,
    emptyPanels,
    balance,
    h('div', { class: 'btn-row btn-row--wrap' }, addPanelBtn, removeBtn),
  );
  const noStory = h('p', { class: 'empty' }, t('story.empty'));

  el.append(
    h('p', { class: 'muted' }, t('story.help')),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'story-select', class: 'field__label' }, t('story.choose')),
      select,
    ),
    h('div', { class: 'btn-row btn-row--wrap' }, newBtn),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'story-example', class: 'field__label' }, t('story.examplesLabel')),
      h('div', { class: 'inline-form' }, exampleSelect, exampleBtn),
    ),
    noStory,
    storyArea,
  );

  /** @type {unknown} */
  let last = null;
  return {
    update(state) {
      /** @type {StoryState | undefined} */
      const s = state.live.modules.story;
      if (!s || s === last) return;
      last = s;
      const current = currentStory(s);
      const signature = s.stories.map((st) => `${st.id}:${st.title}`).join('|');
      if (select.dataset.signature !== signature) {
        select.dataset.signature = signature;
        select.replaceChildren(
          ...s.stories.map((st) => h('option', { value: st.id }, st.title || t('story.untitled'))),
        );
      }
      select.value = s.currentId ?? '';
      select.disabled = s.stories.length === 0;
      newBtn.disabled = s.stories.length >= MAX_STORIES;
      exampleBtn.disabled = s.stories.length >= MAX_STORIES;
      noStory.hidden = Boolean(current);
      storyArea.hidden = !current;
      if (!current) return;

      if (document.activeElement !== titleInput) titleInput.value = current.title;
      const index = currentIndex(s);
      editor.update(current.panels, (i) => (i === index ? 'now' : i < index ? 'done' : undefined));
      emptyPanels.hidden = current.panels.length > 0;
      addPanelBtn.disabled = current.panels.length >= MAX_PANELS;
      const { directive, others, balanced } = sentenceBalance(current.panels);
      balance.textContent = balanced
        ? t('story.balanceOk', { others, directive })
        : t('story.balanceWarn', { others, directive });
      balance.dataset.balanced = String(balanced);
      const count = current.panels.length;
      status.textContent = count
        ? t('story.status', { n: index + 1, count })
        : t('story.statusEmpty');
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= count - 1;
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
