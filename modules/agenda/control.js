// @ts-check
// Panell de control de l'agenda: edició en directe de les activitats.
// Les files es reaprofiten (no es redibuixen) perquè el docent pugui escriure
// sense perdre el focus mentre la projecció s'actualitza al moment.

import { h } from '../../core/dom.js';
import { minutesLeft } from '../../core/clock.js';
import { button, setButton } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { pictoElement } from '../../components/tea-picto.js';
import { confirmDialog } from '../../components/dialog.js';
import { createConfigForm } from '../../components/config-form.js';
import { MAX_ACTIVITIES, MAX_DURATION, MIN_DURATION } from './logic.js';
import { createAgendaSuggestPanel } from './suggest-panel.js';
import {
  currentActivity,
  getAgenda,
  isFinished,
  remainingMs,
  statusOf,
  totalMinutes,
} from './selectors.js';

/** @typedef {import('../../core/types.js').ModuleContext} ModuleContext */
/** @typedef {import('../../core/types.js').Activity} Activity */
/** @typedef {import('./logic.js').AgendaState} AgendaState */
/** @typedef {import('./selectors.js').ActivityStatus} ActivityStatus */

/**
 * @param {HTMLElement} el
 * @param {ModuleContext} ctx
 * @param {import('../../core/types.js').ConfigField[]} schema
 * @returns {import('../../core/types.js').View}
 */
export function renderAgendaControl(el, ctx, schema) {
  const { t, dispatch, ui } = ctx;
  const agenda = () => getAgenda(ctx.getState().live);

  const summary = h('p', { class: 'pane__meta' });
  const status = h('p', { class: 'agenda-status' });

  const prevBtn = button({
    label: t('agenda.prev'),
    icon: 'prev',
    kbd: '←',
    onClick: () => dispatch({ type: 'prev' }),
  });
  const mainBtn = button({
    label: t('agenda.start'),
    icon: 'play',
    variant: 'primary',
    kbd: '→',
    onClick: () => {
      const s = agenda();
      if (!s) return;
      dispatch({ type: s.startedAt === null || isFinished(s) ? 'start' : 'next' });
    },
  });
  const extendBtn = button({
    label: t('agenda.extend', { minutes: 5 }),
    icon: 'plus',
    onClick: () => dispatch({ type: 'extend', payload: { minutes: 5 } }),
  });
  const restartBtn = button({
    label: t('agenda.restartTime'),
    icon: 'reset',
    onClick: () => dispatch({ type: 'restartTime' }),
  });
  const stopBtn = button({
    label: t('agenda.stopTime'),
    icon: 'pause',
    variant: 'ghost',
    onClick: () => dispatch({ type: 'stop' }),
  });

  const list = h('ol', { class: 'agenda-list', 'aria-label': t('agenda.listLabel') });
  const empty = h('p', { class: 'empty' }, t('agenda.empty'));

  const addBtn = button({
    label: t('agenda.add'),
    icon: 'plus',
    onClick: () => {
      if (!ui) return;
      const id = ui.newId();
      dispatch({
        type: 'add',
        payload: { activity: { id, label: '', picto: null, durationMin: 10, kind: 'normal' } },
      });
      rows.get(id)?.focusLabel();
    },
  });
  const changeBtn = button({
    label: t('agenda.announceChange'),
    icon: 'change',
    className: 'btn--change',
    onClick: () => {
      if (!ui) return;
      const id = ui.newId();
      const label = t('agenda.changeDefault');
      const pictoId = ctx.pictos.starterId('canvi');
      dispatch({
        type: 'insertChange',
        payload: {
          activity: {
            id,
            label,
            picto: pictoId ? { source: 'arasaac', id: pictoId, alt: label } : null,
            durationMin: 10,
          },
        },
      });
      ui.announce(t('agenda.changeAdded'));
      rows.get(id)?.focusLabel(true);
    },
  });

  const configForm = createConfigForm({
    schema,
    values: ctx.getState().live.config.agenda ?? {},
    t,
    onChange: (patch) =>
      dispatch({ module: 'core', type: 'setModuleConfig', payload: { moduleId: 'agenda', patch } }),
  });

  el.append(
    h(
      'div',
      { class: 'pane__head' },
      h('h2', { class: 'pane__title', id: 'agenda-title' }, icon('list'), t('agenda.title')),
      summary,
    ),
    status,
    h(
      'div',
      { class: 'btn-row agenda-transport', role: 'group', 'aria-label': t('agenda.controls') },
      prevBtn,
      mainBtn,
      extendBtn,
      restartBtn,
      stopBtn,
    ),
    list,
    empty,
    h('div', { class: 'btn-row' }, addBtn, changeBtn),
    createAgendaSuggestPanel(ctx),
    h(
      'details',
      { class: 'pane__config' },
      h('summary', null, t('common.displayOptions')),
      configForm.el,
    ),
  );

  /** @type {Map<string, ReturnType<typeof createRow>>} */
  const rows = new Map();

  /** @param {Activity} activity */
  function createRow(activity) {
    let index = 0;
    /** @type {Activity} */
    let current = activity;
    /** @type {string} */
    let pictoKey = '';

    // El número fa de nansa per reordenar arrossegant. Només és per al punter:
    // amb el teclat (o un sol clic) es fan servir els botons «Mou amunt/avall».
    const numText = h('span');
    const num = h(
      'span',
      {
        class: 'agenda-row__num agenda-row__handle',
        'aria-hidden': 'true',
        title: t('agenda.dragHint'),
      },
      icon('grip'),
      numText,
    );
    const badge = h('span', { class: 'agenda-row__badge' });
    const pictoBtn = h('button', { type: 'button', class: 'picto-btn' });
    const labelInput = h('input', {
      type: 'text',
      class: 'input agenda-row__label',
      maxlength: 60,
      placeholder: t('agenda.labelPlaceholder'),
    });
    const durInput = h('input', {
      type: 'number',
      class: 'input input--number',
      min: MIN_DURATION,
      max: MAX_DURATION,
      step: 1,
      inputmode: 'numeric',
    });
    const changeToggle = button({
      label: t('agenda.markChange'),
      icon: 'change',
      variant: 'ghost',
      iconOnly: true,
      className: 'toggle-change',
    });
    const upBtn = button({
      label: t('agenda.moveUp'),
      icon: 'up',
      variant: 'ghost',
      iconOnly: true,
    });
    const downBtn = button({
      label: t('agenda.moveDown'),
      icon: 'down',
      variant: 'ghost',
      iconOnly: true,
    });
    const goBtn = button({
      label: t('agenda.goTo'),
      icon: 'next',
      variant: 'ghost',
      iconOnly: true,
    });
    const delBtn = button({
      label: t('agenda.remove'),
      icon: 'trash',
      variant: 'ghost',
      iconOnly: true,
    });

    const li = h(
      'li',
      { class: 'agenda-row' },
      num,
      pictoBtn,
      h('div', { class: 'agenda-row__main' }, labelInput, badge),
      h(
        'label',
        { class: 'agenda-row__dur' },
        durInput,
        h('span', { class: 'agenda-row__unit' }, t('common.minutesShort')),
      ),
      h('div', { class: 'agenda-row__actions' }, changeToggle, upBtn, downBtn, goBtn, delBtn),
    );

    const patch = (/** @type {Partial<Activity>} */ p) =>
      dispatch({ type: 'update', payload: { id: current.id, patch: p } });

    num.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      num.setPointerCapture(event.pointerId);
      li.dataset.dragging = 'true';
      /** @param {PointerEvent} e */
      const move = (e) => {
        // La posició nova és la de la fila que hi ha sota el punter.
        const others = [...list.children];
        let to = others.length - 1;
        for (let i = 0; i < others.length; i++) {
          const rect = others[i].getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            to = i;
            break;
          }
        }
        if (to !== index) dispatch({ type: 'moveTo', payload: { id: current.id, to } });
      };
      const up = () => {
        delete li.dataset.dragging;
        num.removeEventListener('pointermove', move);
        num.removeEventListener('pointerup', up);
        num.removeEventListener('pointercancel', up);
      };
      num.addEventListener('pointermove', move);
      num.addEventListener('pointerup', up);
      num.addEventListener('pointercancel', up);
    });

    labelInput.addEventListener('input', () => patch({ label: labelInput.value }));
    durInput.addEventListener('change', () => {
      const n = Number(durInput.value);
      if (Number.isFinite(n) && n >= MIN_DURATION) patch({ durationMin: n });
      else durInput.value = String(current.durationMin);
    });
    pictoBtn.addEventListener('click', async () => {
      const ref = await ui?.pickPicto({ query: current.label });
      if (ref !== undefined)
        patch({ picto: ref ? { ...ref, alt: current.label || ref.alt } : null });
    });
    changeToggle.addEventListener('click', () =>
      patch({ kind: current.kind === 'change' ? 'normal' : 'change' }),
    );
    upBtn.addEventListener('click', () =>
      dispatch({ type: 'move', payload: { id: current.id, delta: -1 } }),
    );
    downBtn.addEventListener('click', () =>
      dispatch({ type: 'move', payload: { id: current.id, delta: 1 } }),
    );
    goBtn.addEventListener('click', () => dispatch({ type: 'goTo', payload: { index } }));
    delBtn.addEventListener('click', async () => {
      const name = current.label || t('agenda.untitled');
      const ok = await confirmDialog({
        t,
        title: t('agenda.removeTitle'),
        message: t('agenda.removeConfirm', { name }),
        confirmLabel: t('common.delete'),
        danger: true,
      });
      if (!ok) return;
      // El focus passa a la fila següent (o al botó d'afegir) per no perdre'l.
      const sibling = li.nextElementSibling ?? li.previousElementSibling;
      dispatch({ type: 'remove', payload: { id: current.id } });
      const target = sibling?.querySelector('.agenda-row__label');
      if (target instanceof HTMLElement) target.focus();
      else addBtn.focus();
      ui?.announce(t('agenda.removed', { name }));
    });

    return {
      el: li,
      /** @param {boolean} [select] */
      focusLabel(select = false) {
        labelInput.focus();
        if (select) labelInput.select();
      },
      /**
       * @param {Activity} a
       * @param {number} i
       * @param {ActivityStatus} rowStatus
       * @param {number} count
       */
      update(a, i, rowStatus, count) {
        current = a;
        index = i;
        li.dataset.status = rowStatus;
        li.dataset.kind = a.kind;
        numText.textContent = String(i + 1);
        badge.textContent =
          rowStatus === 'now' ? t('status.now') : rowStatus === 'done' ? t('status.done') : '';
        badge.hidden = badge.textContent === '';
        if (a.kind === 'change') {
          badge.hidden = false;
          badge.textContent = [badge.textContent, t('status.change')].filter(Boolean).join(' · ');
        }
        const name = a.label || t('agenda.untitled');
        labelInput.setAttribute('aria-label', t('agenda.labelInput', { n: i + 1 }));
        durInput.setAttribute('aria-label', t('agenda.durationInput', { name }));
        if (document.activeElement !== labelInput && labelInput.value !== a.label) {
          labelInput.value = a.label;
        }
        if (document.activeElement !== durInput) durInput.value = String(a.durationMin);

        const key = a.picto ? `${a.picto.source}:${a.picto.id}` : '';
        if (key !== pictoKey) {
          pictoKey = key;
          pictoBtn.replaceChildren(
            a.picto ? pictoElement(a.picto, { decorative: true }) : icon('image'),
          );
          pictoBtn.classList.toggle('picto-btn--empty', !a.picto);
        }
        pictoBtn.setAttribute(
          'aria-label',
          a.picto ? t('agenda.changePicto', { name }) : t('agenda.addPicto', { name }),
        );
        changeToggle.setAttribute('aria-pressed', String(a.kind === 'change'));
        upBtn.disabled = i === 0;
        downBtn.disabled = i === count - 1;
        goBtn.disabled = rowStatus === 'now';
        setButton(goBtn, { label: t('agenda.goToNamed', { name }) });
        setButton(delBtn, { label: t('agenda.removeNamed', { name }) });
      },
    };
  }

  /** @param {AgendaState} s */
  function syncRows(s) {
    const active = document.activeElement;
    const seen = new Set();
    s.activities.forEach((a, i) => {
      let row = rows.get(a.id);
      if (!row) {
        row = createRow(a);
        rows.set(a.id, row);
      }
      row.update(a, i, statusOf(s, i), s.activities.length);
      seen.add(a.id);
    });
    for (const [id, row] of rows) {
      if (!seen.has(id)) {
        row.el.remove();
        rows.delete(id);
      }
    }
    // Ordre: només movem els nodes que no són al seu lloc.
    s.activities.forEach((a, i) => {
      const rowEl = /** @type {HTMLElement} */ (rows.get(a.id)?.el);
      if (list.children[i] !== rowEl) list.insertBefore(rowEl, list.children[i] ?? null);
    });
    // Moure un node li pot treure el focus; el retornem.
    if (active instanceof HTMLElement && active.isConnected && document.activeElement !== active) {
      active.focus();
    }
  }

  /** @type {AgendaState | null} */
  let last = null;
  let lastStatus = '';

  /** @param {number} now */
  function tick(now) {
    const s = agenda();
    let text = '';
    if (s && s.activities.length > 0) {
      const current = currentActivity(s);
      const name = current?.label || t('agenda.untitled');
      const rem = remainingMs(s, now);
      if (isFinished(s)) text = t('agenda.statusFinished');
      else if (rem === null) text = t('agenda.statusStopped', { name });
      else if (rem > 0) text = t('agenda.statusNow', { name, count: minutesLeft(rem) });
      else text = t('agenda.statusOver', { name });
    }
    if (text !== lastStatus) {
      lastStatus = text;
      status.textContent = text;
    }
  }

  return {
    /** @param {import('../../core/types.js').SharedState} state */
    update(state) {
      const s = getAgenda(state.live);
      configForm.update(state.live.config.agenda ?? {});
      if (!s || s === last) return;
      last = s;
      syncRows(s);
      const count = s.activities.length;
      empty.hidden = count > 0;
      summary.textContent = count
        ? t('agenda.summary', { count, minutes: totalMinutes(s.activities) })
        : '';
      const finished = isFinished(s);
      const notStarted = s.startedAt === null && !finished;
      setButton(mainBtn, {
        label: finished ? t('agenda.restart') : notStarted ? t('agenda.start') : t('agenda.next'),
        icon: notStarted || finished ? 'play' : 'skip',
      });
      mainBtn.disabled = count === 0;
      prevBtn.disabled = s.currentIndex === 0;
      extendBtn.disabled = s.startedAt === null;
      restartBtn.disabled = finished || count === 0;
      stopBtn.hidden = s.startedAt === null;
      addBtn.disabled = count >= MAX_ACTIVITIES;
      changeBtn.disabled = count >= MAX_ACTIVITIES;
      tick(ctx.now());
    },
    tick,
    destroy() {
      el.replaceChildren();
    },
  };
}
