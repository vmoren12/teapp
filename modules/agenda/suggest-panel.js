// @ts-check
// «Escriu l'agenda»: el docent escriu les activitats seguides i se'n creen
// totes de cop, cadascuna amb un pictograma suggerit (com «Escriu la història»
// a les històries socials). Després es poden revisar i canviar a la llista.
//
// Privacitat: per defecte tot es fa al dispositiu amb els pictogrames inclosos.
// Només si el docent ho marca, per a les activitats sense pictograma s'envia a
// ARASAAC una sola paraula clau (com en una cerca normal).

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { confirmDialog } from '../../components/dialog.js';
import { createPictoSuggester } from '../shared/suggest-pictos.js';
import { parseList } from '../story/suggest.js';
import { MAX_ACTIVITIES } from './logic.js';
import { getAgenda } from './selectors.js';
import { splitAgendaText } from './suggest.js';

/** Durada de les activitats que no en porten al text. */
const DEFAULT_MINUTES = 10;

/**
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {HTMLElement}
 */
export function createAgendaSuggestPanel(ctx) {
  const { t, dispatch, ui } = ctx;
  const text = h('textarea', {
    id: 'agenda-text',
    class: 'input agenda-text',
    rows: 4,
    maxlength: 2000,
    placeholder: t('agenda.suggest.placeholder'),
    'aria-describedby': 'agenda-text-hint',
  });
  const online = h('input', {
    type: 'checkbox',
    id: 'agenda-online',
    'aria-describedby': 'agenda-online-hint',
  });
  const replace = h('input', { type: 'checkbox', id: 'agenda-replace' });
  const status = h('p', { class: 'field__hint', role: 'status' });

  const run = button({
    label: t('agenda.suggest.run'),
    icon: 'list',
    variant: 'primary',
    onClick: async () => {
      if (!ui) return;
      const pieces = splitAgendaText(text.value, {
        connectors: parseList(t('agenda.suggest.connectors')),
        separators: t('agenda.suggest.separators')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      });
      if (pieces.length === 0) {
        status.textContent = t('agenda.suggest.empty');
        return;
      }
      const current = getAgenda(ctx.getState().live)?.activities.length ?? 0;
      if (replace.checked && current > 0) {
        const ok = await confirmDialog({
          t,
          title: t('agenda.suggest.replaceTitle'),
          message: t('agenda.suggest.replaceConfirm', { count: current }),
          confirmLabel: t('agenda.suggest.replaceAction'),
          danger: true,
        });
        if (!ok) return;
      }
      const room = MAX_ACTIVITIES - (replace.checked ? 0 : current);
      const used = pieces.slice(0, Math.max(0, room));
      if (used.length === 0) {
        status.textContent = t('agenda.suggest.full', { max: MAX_ACTIVITIES });
        return;
      }
      run.disabled = true;
      const suggest = createPictoSuggester(ctx, { online: online.checked });
      const activities = [];
      for (const piece of used) {
        const label = piece.label.slice(0, 60);
        activities.push({
          id: ui.newId(),
          label,
          picto: await suggest(piece.label, label),
          durationMin: piece.durationMin ?? DEFAULT_MINUTES,
          kind: 'normal',
        });
      }
      dispatch({ type: 'addMany', payload: { activities, replace: replace.checked } });
      run.disabled = false;
      const message =
        used.length < pieces.length
          ? t('agenda.suggest.tooLong', { max: MAX_ACTIVITIES })
          : t('agenda.suggest.done', { count: activities.length });
      status.textContent = message;
      ui.announce(message);
    },
  });

  return h(
    'details',
    { class: 'agenda-suggest' },
    h('summary', null, t('agenda.suggest.title')),
    h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'agenda-text', class: 'field__label' }, t('agenda.suggest.label')),
        text,
        h('p', { class: 'field__hint', id: 'agenda-text-hint' }, t('agenda.suggest.hint')),
      ),
      h(
        'div',
        { class: 'field field--check' },
        online,
        h('label', { for: 'agenda-online' }, t('agenda.suggest.online')),
        h('p', { class: 'field__hint', id: 'agenda-online-hint' }, t('agenda.suggest.onlineHint')),
      ),
      h(
        'div',
        { class: 'field field--check' },
        replace,
        h('label', { for: 'agenda-replace' }, t('agenda.suggest.replace')),
      ),
      h('div', { class: 'btn-row' }, run),
      status,
    ),
  );
}
