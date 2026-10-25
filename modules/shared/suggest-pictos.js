// @ts-check
// Suggeriment de pictogrames per a frases escrites pel docent. El fan servir
// les històries socials («Escriu la història») i l'agenda («Escriu l'agenda»).
//
// Privacitat: per defecte tot es fa al dispositiu amb els pictogrames inclosos.
// Només si el docent ho marca, quan no se'n troba cap s'envia a ARASAAC una
// sola paraula clau (com en una cerca normal).

import { searchArasaac } from '../../pictograms/arasaac.js';
import { keyword, parseList, pickPicto } from '../story/suggest.js';

/** @typedef {import('../../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../../core/types.js').ModuleContext} ModuleContext */

/**
 * Prepara el suggeridor amb els pictogrames inclosos (nom i sinònims de
 * l'idioma) i les paraules buides.
 * @param {ModuleContext} ctx
 * @param {{ online: boolean }} options
 * @returns {(sentence: string, alt: string) => Promise<PictoRef | null>}
 */
export function createPictoSuggester(ctx, { online }) {
  const { t } = ctx;
  const candidates = ctx.pictos.starterItems().map(({ key }) => {
    const synonyms = t(`story.suggest.synonyms.${key}`);
    return {
      key,
      terms: [
        t(`starter.${key}`),
        ...(synonyms.startsWith('story.') ? [] : synonyms.split(',')),
      ].filter(Boolean),
    };
  });
  const stopwords = parseList(t('story.suggest.stopwords'));
  const locale = document.documentElement.lang || 'ca';

  return async (sentence, alt) => {
    const starterKey = pickPicto(sentence, candidates);
    const starterId = starterKey ? ctx.pictos.starterId(starterKey) : null;
    if (starterId) return { source: 'arasaac', id: starterId, alt };
    if (!online) return null;
    const word = keyword(sentence, stopwords);
    try {
      const [found] = word ? await searchArasaac(word, locale, { limit: 1 }) : [];
      if (!found) return null;
      await ctx.pictos.saveArasaac(found.id, found.label);
      return { source: 'arasaac', id: found.id, alt };
    } catch {
      // Sense connexió: queda sense pictograma.
      return null;
    }
  };
}
