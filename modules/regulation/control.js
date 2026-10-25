// @ts-check
// Panell de control de les eines de regulació (termòmetre i respiració).

import { h } from '../../core/dom.js';
import { button, setButton } from '../../components/button.js';
import { createConfigForm } from '../../components/config-form.js';
import { createItemListEditor } from '../../components/item-list-editor.js';
import {
  EXAMPLE_LEVELS,
  LEVEL_COLORS,
  MAX_LEVELS,
  MAX_STRATEGIES,
  MIN_LEVELS,
  TOOLS,
} from './logic.js';

/** @typedef {import('./logic.js').RegulationState} RegulationState */
/** @typedef {import('./logic.js').Level} Level */

/**
 * @param {HTMLElement} el
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderRegulationControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;

  // --- Eina ---------------------------------------------------------------------------
  const toolInputs = TOOLS.map((tool) => {
    const input = h('input', { type: 'radio', name: 'regulation-tool', value: tool });
    input.addEventListener(
      'change',
      () => input.checked && dispatch({ type: 'setTool', payload: { tool } }),
    );
    return { tool, input };
  });
  const toolField = h(
    'fieldset',
    { class: 'field segmented' },
    h('legend', { class: 'field__label' }, t('regulation.tool')),
    h(
      'div',
      { class: 'segmented__options' },
      toolInputs.map(({ tool, input }) =>
        h(
          'label',
          { class: 'segmented__option' },
          input,
          h('span', null, t(`regulation.tools.${tool}`)),
        ),
      ),
    ),
  );

  // --- Termòmetre ------------------------------------------------------------------------
  /** @param {'three' | 'five'} size */
  const fillExample = (size) => {
    if (!ui) return;
    const levels = EXAMPLE_LEVELS[size].map(([color, key, strategies]) => ({
      id: ui.newId(),
      label: t(`regulation.examples.${key}`),
      color,
      strategies: strategies.map(([textKey, pictoKey]) => {
        const label = t(`regulation.strategies.${textKey}`);
        const id = ctx.pictos.starterId(pictoKey);
        return { id: ui.newId(), label, picto: id ? { source: 'arasaac', id, alt: label } : null };
      }),
    }));
    dispatch({ type: 'setLevels', payload: { levels } });
    ui.announce(t('regulation.exampleApplied'));
  };
  const exampleButtons = h(
    'div',
    { class: 'btn-row btn-row--wrap' },
    button({
      label: t('regulation.exampleFive'),
      icon: 'templates',
      onClick: () => fillExample('five'),
    }),
    button({
      label: t('regulation.exampleThree'),
      icon: 'templates',
      onClick: () => fillExample('three'),
    }),
  );
  const levelList = h('ol', {
    class: 'regulation-levels',
    'aria-label': t('regulation.levelsLabel'),
  });
  const addLevelBtn = button({
    label: t('regulation.addLevel'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      dispatch({
        type: 'addLevel',
        payload: { level: { id: ui.newId(), label: '', color: 'orange', strategies: [] } },
      });
    },
  });
  const thermometer = h(
    'section',
    { class: 'stack', 'aria-labelledby': 'regulation-thermo-title' },
    h(
      'h4',
      { class: 'field__label', id: 'regulation-thermo-title' },
      t('regulation.tools.thermometer'),
    ),
    h('p', { class: 'muted' }, t('regulation.thermometerHelp')),
    h('p', { class: 'callout' }, t('regulation.privacy')),
    exampleButtons,
    levelList,
    h('div', { class: 'btn-row' }, addLevelBtn),
  );

  /** @type {Map<string, ReturnType<typeof levelRow>>} */
  const rows = new Map();

  /** @param {Level} level */
  function levelRow(level) {
    let current = level;
    const nameId = `regulation-level-${level.id}`;
    const name = h('input', { type: 'text', id: nameId, class: 'input', maxlength: 40 });
    name.addEventListener('input', () =>
      dispatch({ type: 'updateLevel', payload: { id: current.id, patch: { label: name.value } } }),
    );
    const color = h(
      'select',
      { class: 'input input--small', 'aria-label': t('regulation.colorLabel') },
      LEVEL_COLORS.map((c) => h('option', { value: c }, t(`regulation.colors.${c}`))),
    );
    color.addEventListener('change', () =>
      dispatch({ type: 'updateLevel', payload: { id: current.id, patch: { color: color.value } } }),
    );
    const upBtn = button({
      label: t('common.moveUp'),
      icon: 'up',
      variant: 'ghost',
      iconOnly: true,
      onClick: () => dispatch({ type: 'moveLevel', payload: { id: current.id, delta: -1 } }),
    });
    const downBtn = button({
      label: t('common.moveDown'),
      icon: 'down',
      variant: 'ghost',
      iconOnly: true,
      onClick: () => dispatch({ type: 'moveLevel', payload: { id: current.id, delta: 1 } }),
    });
    const removeBtn = button({
      label: t('common.delete'),
      icon: 'trash',
      variant: 'ghost',
      iconOnly: true,
      onClick: () => dispatch({ type: 'removeLevel', payload: { id: current.id } }),
    });
    const strategies = createItemListEditor({
      t,
      ui,
      label: t('regulation.strategiesLabel'),
      itemLabel: (n) => t('regulation.strategyLabel', { n }),
      placeholder: t('regulation.strategyPlaceholder'),
      untitled: t('regulation.strategyUntitled'),
      maxLength: 40,
      onPatch: (id, patch) =>
        dispatch({ type: 'updateStrategy', payload: { levelId: current.id, id, patch } }),
      onMove: (id, delta) =>
        dispatch({ type: 'moveStrategy', payload: { levelId: current.id, id, delta } }),
      onRemove: (id) => dispatch({ type: 'removeStrategy', payload: { levelId: current.id, id } }),
    });
    const addStrategyBtn = button({
      label: t('regulation.addStrategy'),
      icon: 'plus',
      variant: 'ghost',
      onClick: () => {
        if (!ui) return;
        const id = ui.newId();
        dispatch({
          type: 'addStrategy',
          payload: { levelId: current.id, item: { id, label: '', picto: null } },
        });
        strategies.focus(id);
      },
    });
    const label = h('label', { for: nameId, class: 'field__label' });
    const li = h(
      'li',
      { class: 'regulation-level' },
      h(
        'div',
        { class: 'regulation-level__head' },
        h('span', { class: 'regulation-level__swatch', 'aria-hidden': 'true' }),
        h('div', { class: 'field regulation-level__name' }, label, name),
        color,
        h('div', { class: 'item-row__actions' }, upBtn, downBtn, removeBtn),
      ),
      strategies.el,
      h('div', { class: 'btn-row' }, addStrategyBtn),
    );
    return {
      el: li,
      /** @param {Level} next @param {number} i @param {number} count */
      update(next, i, count) {
        current = next;
        li.dataset.color = next.color;
        label.textContent = t('regulation.levelName', { n: i + 1 });
        if (document.activeElement !== name && name.value !== next.label) name.value = next.label;
        color.value = next.color;
        upBtn.disabled = i === 0;
        downBtn.disabled = i === count - 1;
        removeBtn.disabled = count <= MIN_LEVELS;
        const levelName = next.label || t('regulation.levelName', { n: i + 1 });
        setButton(removeBtn, { label: t('common.deleteNamed', { name: levelName }) });
        setButton(upBtn, { label: t('common.moveUpNamed', { name: levelName }) });
        setButton(downBtn, { label: t('common.moveDownNamed', { name: levelName }) });
        strategies.update(next.strategies);
        addStrategyBtn.disabled = next.strategies.length >= MAX_STRATEGIES;
      },
    };
  }

  // --- Respiració ---------------------------------------------------------------------
  const breathBtn = button({
    label: t('regulation.startBreathing'),
    icon: 'play',
    variant: 'primary',
    onClick: () => {
      const s = ctx.getState().live.modules.regulation;
      dispatch({ type: s?.breathingSince === null ? 'startBreathing' : 'stopBreathing' });
    },
  });
  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.regulation ?? {},
    t,
    onChange: (patch) =>
      dispatch({
        module: 'core',
        type: 'setModuleConfig',
        payload: { moduleId: 'regulation', patch },
      }),
  });
  const breathing = h(
    'section',
    { class: 'stack', 'aria-labelledby': 'regulation-breath-title' },
    h(
      'h4',
      { class: 'field__label', id: 'regulation-breath-title' },
      t('regulation.tools.breathing'),
    ),
    h('p', { class: 'muted' }, t('regulation.breathingHelp')),
    h('div', { class: 'btn-row' }, breathBtn),
    configForm.el,
  );

  el.append(toolField, thermometer, breathing);

  /** @type {unknown} */
  let last = null;
  return {
    update(state) {
      configForm.update(state.live.config.regulation ?? {});
      /** @type {RegulationState | undefined} */
      const s = state.live.modules.regulation;
      if (!s || s === last) return;
      last = s;
      for (const { tool, input } of toolInputs) input.checked = s.tool === tool;
      thermometer.hidden = s.tool !== 'thermometer';
      breathing.hidden = s.tool !== 'breathing';

      const running = s.breathingSince !== null;
      setButton(breathBtn, {
        label: running ? t('regulation.stopBreathing') : t('regulation.startBreathing'),
        icon: running ? 'pause' : 'play',
      });

      const seen = new Set();
      s.levels.forEach((level, i) => {
        let row = rows.get(level.id);
        if (!row) {
          row = levelRow(level);
          rows.set(level.id, row);
        }
        row.update(level, i, s.levels.length);
        seen.add(level.id);
        if (levelList.children[i] !== row.el)
          levelList.insertBefore(row.el, levelList.children[i] ?? null);
      });
      for (const [id, row] of rows) {
        if (!seen.has(id)) {
          row.el.remove();
          rows.delete(id);
        }
      }
      levelList.hidden = s.levels.length === 0;
      addLevelBtn.hidden = s.levels.length === 0;
      addLevelBtn.disabled = s.levels.length >= MAX_LEVELS;
    },
    destroy() {
      el.replaceChildren();
    },
  };
}
