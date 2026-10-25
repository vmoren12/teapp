// @ts-check
// «Escriu la història»: el docent escriu el text sencer i l'aplicació en
// proposa la seqüència de vinyetes (una per frase, amb tipus de frase i
// pictograma). Es crea com una història nova, que es pot revisar i editar.
//
// Privacitat: per defecte tot es fa al dispositiu amb els pictogrames inclosos.
// Només si el docent ho marca, per a les vinyetes sense pictograma s'envia a
// ARASAAC una sola paraula clau (com en una cerca normal).

import { h } from '../../core/dom.js';
import { button } from '../../components/button.js';
import { searchArasaac } from '../../pictograms/arasaac.js';
import { MAX_PANELS, MAX_TEXT } from './logic.js';
import { classifySentence, keyword, parseList, pickPicto, splitSentences } from './suggest.js';

/**
 * @param {import('../../core/types.js').ModuleContext} ctx
 * @returns {HTMLElement}
 */
export function createSuggestPanel(ctx) {
  const { t, dispatch, ui } = ctx;
  const text = h('textarea', {
    id: 'story-text',
    class: 'input story-text',
    rows: 5,
    maxlength: 2000,
    placeholder: t('story.suggest.placeholder'),
    'aria-describedby': 'story-text-hint',
  });
  const online = h('input', {
    type: 'checkbox',
    id: 'story-online',
    'aria-describedby': 'story-online-hint',
  });
  const status = h('p', { class: 'field__hint', role: 'status' });

  const lexicon = () => ({
    perspective: parseList(t('story.suggest.perspective')),
    directive: parseList(t('story.suggest.directive')),
    affirmative: parseList(t('story.suggest.affirmative')),
  });

  /** Pictogrames inclosos amb el seu nom i els sinònims de l'idioma. */
  const candidates = () =>
    ctx.pictos.starterItems().map(({ key }) => {
      const synonyms = t(`story.suggest.synonyms.${key}`);
      return {
        key,
        terms: [
          t(`starter.${key}`),
          ...(synonyms.startsWith('story.') ? [] : synonyms.split(',')),
        ].filter(Boolean),
      };
    });

  const run = button({
    label: t('story.suggest.run'),
    icon: 'story',
    variant: 'primary',
    onClick: async () => {
      if (!ui) return;
      const sentences = splitSentences(text.value);
      if (sentences.length === 0) {
        status.textContent = t('story.suggest.empty');
        return;
      }
      run.disabled = true;
      const lex = lexicon();
      const cands = candidates();
      const stopwords = parseList(t('story.suggest.stopwords'));
      const locale = document.documentElement.lang || 'ca';
      const used = sentences.slice(0, MAX_PANELS);
      const panels = [];
      for (const sentence of used) {
        const label = sentence.slice(0, MAX_TEXT);
        const starterKey = pickPicto(sentence, cands);
        const starterId = starterKey ? ctx.pictos.starterId(starterKey) : null;
        /** @type {import('../../core/types.js').PictoRef | null} */
        let picto = starterId ? { source: 'arasaac', id: starterId, alt: label } : null;
        if (!picto && online.checked) {
          const word = keyword(sentence, stopwords);
          try {
            const [found] = word ? await searchArasaac(word, locale, { limit: 1 }) : [];
            if (found) {
              await ctx.pictos.saveArasaac(found.id, found.label);
              picto = { source: 'arasaac', id: found.id, alt: label };
            }
          } catch {
            // Sense connexió: la vinyeta queda sense pictograma.
          }
        }
        panels.push({ id: ui.newId(), label, picto, kind: classifySentence(sentence, lex) });
      }
      const title = used[0].replace(/[.!?;…]+$/, '').slice(0, 60);
      dispatch({ type: 'addStory', payload: { story: { id: ui.newId(), title, panels } } });
      run.disabled = false;
      const message =
        sentences.length > MAX_PANELS
          ? t('story.suggest.tooLong', { max: MAX_PANELS })
          : t('story.suggest.done', { count: panels.length });
      status.textContent = message;
      ui.announce(message);
    },
  });

  return h(
    'details',
    { class: 'story-suggest' },
    h('summary', null, t('story.suggest.title')),
    h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'story-text', class: 'field__label' }, t('story.suggest.label')),
        text,
        h('p', { class: 'field__hint', id: 'story-text-hint' }, t('story.suggest.hint')),
      ),
      h(
        'div',
        { class: 'field field--check' },
        online,
        h('label', { for: 'story-online' }, t('story.suggest.online')),
        h('p', { class: 'field__hint', id: 'story-online-hint' }, t('story.suggest.onlineHint')),
      ),
      h('div', { class: 'btn-row' }, run),
      status,
    ),
  );
}
