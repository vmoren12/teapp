// @ts-check
// Selector «Per a quina activitat?» dels mòduls que poden tenir contingut propi
// per a cada activitat de l'agenda (instruccions, expectatives). També explica
// quin contingut es mostra ara a la projecció.

import { h } from '../core/dom.js';
import { button } from './button.js';
import { getAgenda } from '../modules/agenda/selectors.js';
import { GENERAL } from '../modules/shared/items.js';

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   id: string,
 *   onChange: () => void,
 *   onCreate: (activityId: string) => void,
 *   onRemove: (activityId: string) => void,
 * }} options
 */
export function createActivityScope({ t, id, onChange, onCreate, onRemove }) {
  const select = h('select', { id, class: 'input' });
  const showing = h('p', { class: 'field__hint', id: `${id}-showing` });
  select.setAttribute('aria-describedby', `${id}-showing`);
  let key = GENERAL;
  /** @type {Set<string>} */
  let own = new Set();
  let firstUpdate = true;

  const createBtn = button({
    label: t('scope.create'),
    icon: 'plus',
    onClick: () => {
      onCreate(key);
    },
  });
  const removeBtn = button({
    label: t('scope.remove'),
    icon: 'trash',
    variant: 'ghost',
    onClick: () => onRemove(key),
  });
  const ownNote = h('p', { class: 'muted' });

  select.addEventListener('change', () => {
    key = select.value;
    refreshButtons();
    onChange();
  });

  const refreshButtons = () => {
    const isActivity = key !== GENERAL;
    createBtn.hidden = !isActivity || own.has(key);
    removeBtn.hidden = !isActivity || !own.has(key);
    ownNote.hidden = !isActivity || own.has(key);
    ownNote.textContent = t('scope.usesGeneral');
  };

  const el = h(
    'div',
    { class: 'scope' },
    h(
      'div',
      { class: 'field' },
      h('label', { for: id, class: 'field__label' }, t('scope.label')),
      select,
      showing,
    ),
    ownNote,
    h('div', { class: 'btn-row btn-row--wrap' }, createBtn, removeBtn),
  );

  return {
    el,
    /** Llista que s'està editant: GENERAL o l'id d'una activitat amb contingut propi. */
    editing: () => (key !== GENERAL && own.has(key) ? key : key === GENERAL ? GENERAL : null),
    /**
     * @param {import('../core/types.js').LiveSession} live
     * @param {string[]} ownKeys      Activitats que tenen contingut propi.
     * @param {string} active         Clau del contingut que es mostra ara.
     */
    update(live, ownKeys, active) {
      own = new Set(ownKeys);
      const activities = getAgenda(live)?.activities ?? [];
      // La primera vegada, el selector s'obre al contingut que es veu ara.
      if (firstUpdate) {
        firstUpdate = false;
        key = active;
      }
      if (key !== GENERAL && !activities.some((a) => a.id === key)) key = GENERAL;
      const options = [
        h('option', { value: GENERAL }, t('scope.general')),
        ...activities.map((a, i) =>
          h(
            'option',
            { value: a.id },
            t(own.has(a.id) ? 'scope.activityOwn' : 'scope.activity', {
              n: i + 1,
              name: a.label || t('agenda.untitled'),
            }),
          ),
        ),
      ];
      const signature = options.map((o) => `${o.value}:${o.textContent}`).join('|');
      if (select.dataset.signature !== signature) {
        select.dataset.signature = signature;
        select.replaceChildren(...options);
      }
      select.value = key;
      const activeActivity = activities.find((a) => a.id === active);
      showing.textContent = activeActivity
        ? t('scope.showingOwn', { name: activeActivity.label || t('agenda.untitled') })
        : t('scope.showingGeneral');
      refreshButtons();
    },
  };
}
