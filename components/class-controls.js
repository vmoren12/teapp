// @ts-check
// Controls discrets del mode classe (una sola pantalla):
//   - un desplegable per triar què es mostra (agenda, temporitzador…) i per
//     editar ràpidament l'alternança de vistes: activar-la, triar quines vistes
//     s'alternen i quant de temps es mostra cadascuna;
//   - «anterior» i «següent», que fan el mateix que les fletxes: passen
//     l'activitat o, si les instruccions, els torns o una història són a
//     l'escenari, el pas, el torn o la vinyeta.
// Són translúcids i s'amaguen quan el cursor està quiet, perquè no distreguin.
// Es fan servir al mode classe i a la finestra de projecció.
// Després de cada clic el focus torna a la pantalla: així el comandament de
// presentació (que envia fletxes) continua funcionant.

import { h } from '../core/dom.js';
import { button } from './button.js';
import { icon } from './icons.js';
import { actionForKey } from '../core/keyboard.js';
import { defaultItem, isRotating, liveRotation } from '../core/rotation.js';
import { durationSelect } from './rotation-controls.js';

let counter = 0;

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   registry: import('../core/registry.js').Registry,
 *   dispatch: (action: import('../core/types.js').Action) => void,
 *   shortcuts: import('../core/keyboard.js').Shortcut[],
 *   getShared: () => import('../core/types.js').SharedState,
 *   focusHome: () => void,
 * }} deps
 */
export function createClassControls({ t, registry, dispatch, shortcuts, getShared, focusHome }) {
  const menuId = `class-views-${++counter}`;
  const stageModules = registry.stage();

  /** @param {string} key */
  const press = (key) => {
    const action = actionForKey(shortcuts, key, getShared().live.stage);
    if (action) dispatch(action);
    focusHome();
  };

  // --- Desplegable de vistes ----------------------------------------------------------
  const toggleIcon = h('span', { class: 'class-controls__current', 'aria-hidden': 'true' });
  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'btn btn--ghost class-controls__btn class-controls__toggle',
      'aria-expanded': 'false',
      'aria-controls': menuId,
      title: t('classMode.views'),
    },
    toggleIcon,
    h('span', { class: 'class-controls__rotating', 'aria-hidden': 'true' }, icon('rotate')),
    icon('down'),
    h('span', { class: 'sr-only' }, t('classMode.views')),
  );
  const options = stageModules.map((mod) => {
    const name = t(mod.nameKey);
    const btn = button({
      label: name,
      icon: mod.icon,
      variant: 'ghost',
      className: 'class-controls__option',
      onClick: () => {
        dispatch({ module: 'core', type: 'setStage', payload: { id: mod.id } });
        close();
      },
    });
    // Botó ràpid: inclou o treu aquesta vista de l'alternança (el menú no es tanca).
    const include = button({
      label: t('rotation.include', { name }),
      icon: 'rotate',
      variant: 'ghost',
      iconOnly: true,
      className: 'class-controls__include',
      onClick: () =>
        dispatch({
          module: 'core',
          type: 'setRotationItem',
          payload: { id: mod.id, include: include.getAttribute('aria-pressed') !== 'true' },
        }),
    });
    const duration = durationSelect({
      t,
      label: t('rotation.duration', { name }),
      className: 'class-controls__duration',
      onChange: (d) =>
        dispatch({
          module: 'core',
          type: 'setRotationItem',
          payload: { id: mod.id, include: true, ...d },
        }),
    });
    const row = h('div', { class: 'class-controls__row' }, btn, include, duration.el);
    return { id: mod.id, icon: mod.icon, btn, include, duration, row };
  });
  const rotateBtn = button({
    label: t('rotation.toggle'),
    icon: 'rotate',
    variant: 'ghost',
    className: 'class-controls__option class-controls__rotate',
    onClick: () => dispatch({ module: 'core', type: 'toggleRotation' }),
  });
  const rotateHint = h('p', { class: 'class-controls__hint' });
  const calmBtn = button({
    label: t('calm.toggle'),
    icon: 'calm',
    variant: 'ghost',
    className: 'class-controls__option',
    onClick: () => {
      dispatch({ module: 'core', type: 'toggleCalm' });
      close();
    },
  });
  const menu = h(
    'div',
    { class: 'class-controls__menu', id: menuId, hidden: true },
    rotateBtn,
    rotateHint,
    options.map((o) => o.row),
    calmBtn,
  );

  const open = () => {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    el.dataset.open = 'true';
    const current = options.find((o) => o.btn.getAttribute('aria-pressed') === 'true');
    (current?.btn ?? options[0]?.btn)?.focus();
  };
  function close() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    delete el.dataset.open;
    focusHome();
  }
  toggle.addEventListener('click', () => (menu.hidden ? open() : close()));
  // Esc tanca el desplegable (sense sortir del mode classe).
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
    toggle.focus();
  });
  const onOutside = (/** @type {PointerEvent} */ event) => {
    if (!menu.hidden && event.target instanceof Node && !el.contains(event.target)) close();
  };
  document.addEventListener('pointerdown', onOutside, true);

  // --- Anterior / següent -------------------------------------------------------------
  const prevBtn = button({
    label: t('classMode.prev'),
    icon: 'prev',
    variant: 'ghost',
    iconOnly: true,
    className: 'class-controls__btn',
    onClick: () => press('ArrowLeft'),
  });
  const nextBtn = button({
    label: t('classMode.next'),
    icon: 'next',
    variant: 'ghost',
    iconOnly: true,
    className: 'class-controls__btn class-controls__next',
    onClick: () => press('ArrowRight'),
  });

  const el = h(
    'div',
    { class: 'class-controls' },
    h('div', { class: 'class-controls__views' }, toggle, menu),
    h('div', { class: 'class-controls__nav' }, prevBtn, nextBtn),
  );

  let lastIcon = '';
  return {
    el,
    /** @param {import('../core/types.js').SharedState} state */
    update(state) {
      const { stage, calm } = state.live;
      const rotation = liveRotation(state.live);
      for (const o of options) {
        o.btn.setAttribute('aria-pressed', String(!calm && o.id === stage));
        const item = rotation.items.find((i) => i.id === o.id);
        o.include.setAttribute('aria-pressed', String(item !== undefined));
        o.duration.update(item ?? defaultItem(o.id));
        o.duration.el.disabled = item === undefined;
      }
      rotateBtn.setAttribute('aria-pressed', String(rotation.enabled));
      rotateHint.textContent =
        rotation.enabled && !isRotating(rotation) ? t('rotation.needTwo') : '';
      rotateHint.hidden = rotateHint.textContent === '';
      el.dataset.rotating = String(isRotating(rotation) && !calm);
      calmBtn.setAttribute('aria-pressed', String(calm));
      const current = calm ? 'calm' : (options.find((o) => o.id === stage)?.icon ?? 'list');
      if (current !== lastIcon) {
        lastIcon = current;
        toggleIcon.replaceChildren(icon(current));
      }
      const name = calm ? t('calm.toggle') : t(registry.get(stage)?.nameKey ?? 'stage.title');
      toggle.title = t('classMode.viewsNamed', { name });
    },
    destroy() {
      document.removeEventListener('pointerdown', onOutside, true);
    },
  };
}
