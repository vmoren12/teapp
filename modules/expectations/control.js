// @ts-check
// Panell de control de les expectatives de l'activitat.

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { createCardEditor } from '../../components/card-editor.js';
import { createActivityScope } from '../../components/activity-scope.js';
import { activeBoard, boardFor, FIELDS, PRESETS } from './logic.js';
import { VOICE_LEVELS, voiceKey } from '../shared/voice.js';

/** @typedef {import('./logic.js').ExpectationsState} ExpectationsState */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {import('../../core/types.js').View}
 */
export function renderExpectationsControl(el, ctx) {
  const { t, dispatch, ui } = ctx;

  const scope = createActivityScope({
    t,
    id: 'expectations-scope',
    onChange: () => render(),
    onCreate: (key) => {
      dispatch({ type: 'createOwn', payload: { key } });
      ui?.announce(t('scope.created'));
    },
    onRemove: (key) => {
      dispatch({ type: 'removeOwn', payload: { key } });
      ui?.announce(t('scope.removed'));
    },
  });

  // --- Valors predefinits ---------------------------------------------------------
  const presets = PRESETS.map((preset) =>
    button({
      label: t(`expectations.presets.${preset.id}.name`),
      className: 'btn--chip',
      onClick: () => {
        /** @param {string} field @param {string} starterKey */
        const answer = (field, starterKey) => {
          const label = t(`expectations.presets.${preset.id}.${field}`);
          const id = ctx.pictos.starterId(starterKey);
          return { label, picto: id ? { source: 'arasaac', id, alt: label } : null };
        };
        dispatch({
          type: 'apply',
          payload: {
            key: scope.editing(),
            board: {
              where: answer('where', preset.where),
              voice: preset.voice,
              need: answer('need', preset.need),
              when: { ...answer('when', preset.when), timer: preset.timer },
            },
          },
        });
        ui?.announce(
          t('expectations.applied', { name: t(`expectations.presets.${preset.id}.name`) }),
        );
      },
    }),
  );

  // --- Les quatre preguntes -------------------------------------------------------
  /** @param {(typeof FIELDS)[number]} field */
  const answerEditor = (field) =>
    createCardEditor({
      t,
      ui,
      title: t(`expectations.questions.${field}`),
      placeholder: t(`expectations.placeholders.${field}`),
      onChange: (patch) =>
        dispatch({ type: 'setAnswer', payload: { key: scope.editing(), field, patch } }),
    });
  const editors = {
    where: answerEditor('where'),
    need: answerEditor('need'),
    when: answerEditor('when'),
  };

  const timerLink = h('input', { type: 'checkbox', id: 'expectations-timer' });
  timerLink.addEventListener('change', () =>
    dispatch({
      type: 'setAnswer',
      payload: { key: scope.editing(), field: 'when', patch: { timer: timerLink.checked } },
    }),
  );
  editors.when.extra(
    h(
      'div',
      { class: 'field field--check' },
      timerLink,
      h('label', { for: 'expectations-timer' }, t('expectations.timerLink')),
    ),
  );

  const voiceInputs = [null, ...VOICE_LEVELS].map((level) => {
    const input = h('input', { type: 'radio', name: 'expectations-voice', value: String(level) });
    input.addEventListener('change', () => {
      if (input.checked) dispatch({ type: 'setVoice', payload: { key: scope.editing(), level } });
    });
    return { level, input };
  });
  const voice = h(
    'fieldset',
    { class: 'field segmented' },
    h('legend', { class: 'field__label' }, t('expectations.questions.voice')),
    h(
      'div',
      { class: 'segmented__options' },
      voiceInputs.map(({ level, input }) =>
        h(
          'label',
          { class: 'segmented__option' },
          input,
          h('span', null, level === null ? t('expectations.voiceNone') : t(voiceKey(level))),
        ),
      ),
    ),
  );

  const clearBtn = button({
    label: t('expectations.clear'),
    icon: 'trash',
    variant: 'ghost',
    onClick: () => dispatch({ type: 'clear', payload: { key: scope.editing() } }),
  });

  const editArea = h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'field' },
      h('p', { class: 'field__label', id: 'expectations-presets' }, t('expectations.presetsLabel')),
      h(
        'div',
        {
          class: 'btn-row btn-row--wrap',
          role: 'group',
          'aria-labelledby': 'expectations-presets',
        },
        presets,
      ),
    ),
    h(
      'div',
      { class: 'expect-editors' },
      editors.where.el,
      voice,
      editors.need.el,
      editors.when.el,
    ),
    h('div', { class: 'btn-row' }, clearBtn),
  );

  el.append(h('p', { class: 'muted' }, t('expectations.help')), scope.el, editArea);

  function render() {
    const state = ctx.getState();
    /** @type {ExpectationsState | undefined} */
    const s = state.live.modules.expectations;
    if (!s) return;
    scope.update(state.live, Object.keys(s.byActivity), activeBoard(s, state.live).key);
    const key = scope.editing();
    const board = key ? boardFor(s, key) : null;
    editArea.hidden = !board;
    if (!board) return;
    for (const field of FIELDS) editors[field].update(board[field]);
    timerLink.checked = board.when.timer;
    for (const { level, input } of voiceInputs) input.checked = board.voice === level;
  }

  /** @type {unknown} */
  let lastState = null;
  /** @type {unknown} */
  let lastAgenda = null;
  return {
    update(state) {
      const s = state.live.modules.expectations;
      const agenda = state.live.modules.agenda;
      if (s === lastState && agenda === lastAgenda) return;
      lastState = s;
      lastAgenda = agenda;
      render();
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
