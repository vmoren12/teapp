// @ts-check
// Suggeriment automàtic de vinyetes a partir d'un text escrit pel docent.
// Tot passa al dispositiu: es divideix el text en frases, es proposa el tipus
// de frase (pautes de Carol Gray) i un pictograma del paquet inicial. El docent
// ho revisa i ho pot canviar tot després.
//
// Les paraules que fan servir les regles (p. ex. «podem», «potser») són a
// l'idioma (`story.suggest.*`), perquè depenen de la llengua del text.

/** @typedef {import('./logic.js').SentenceKind} SentenceKind */

/** @param {string} text */
export const normalize = (text) =>
  text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');

/** Paraules d'un text normalitzat (lletres i números). @param {string} text */
export const words = (text) => normalize(text).match(/[\p{L}\p{N}·]+/gu) ?? [];

/** Llista separada per comes («a, b, c») → expressions normalitzades. @param {string} list */
export const parseList = (list) =>
  list
    .split(',')
    .map((x) => normalize(x).trim())
    .filter(Boolean);

/**
 * Divideix un text en frases: punt, signes d'exclamació i interrogació,
 * punt i coma i salts de línia. Les frases buides es descarten.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  return text
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?;…])\s+/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/**
 * Tipus de frase proposat. Ordre de les regles: perspectiva (què sentim o
 * pensem), directiva (què podem fer), afirmativa (valor compartit) i, si no,
 * descriptiva (la més habitual a les històries socials).
 * @param {string} sentence
 * @param {{ perspective: string[], directive: string[], affirmative: string[] }} lexicon
 * @returns {SentenceKind}
 */
export function classifySentence(sentence, lexicon) {
  const text = ` ${words(sentence).join(' ')} `;
  const has = (/** @type {string[]} */ list) => list.some((cue) => text.includes(` ${cue} `));
  if (has(lexicon.perspective)) return 'perspective';
  if (has(lexicon.directive)) return 'directive';
  if (has(lexicon.affirmative)) return 'affirmative';
  return 'descriptive';
}

/**
 * Dues paraules «s'assemblen» si són iguals o comparteixen arrel (els cinc
 * primers caràcters, en paraules prou llargues): professor ≈ professora.
 * @param {string} a @param {string} b
 */
const similar = (a, b) =>
  a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));

/**
 * Pictograma més adequat per a una frase entre els candidats (clau + termes).
 * Retorna la clau o null si cap terme hi apareix.
 * @param {string} sentence
 * @param {{ key: string, terms: string[] }[]} candidates
 * @returns {string | null}
 */
export function pickPicto(sentence, candidates) {
  const list = words(sentence).filter((w) => w.length >= 3);
  let best = null;
  let bestScore = 0;
  for (const { key, terms } of candidates) {
    for (const term of terms) {
      const parts = words(term);
      if (parts.length === 0) continue;
      // Tots els mots del terme han de ser a la frase («beure aigua» → beure i aigua).
      const ok = parts.every((p) => list.some((w) => similar(w, p)));
      const score = ok ? parts.join('').length : 0;
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    }
  }
  return best;
}

/**
 * Paraula clau d'una frase per cercar-ne el pictograma (la més llarga que no
 * sigui una paraula buida).
 * @param {string} sentence @param {string[]} stopwords
 */
export function keyword(sentence, stopwords) {
  const stop = new Set(stopwords);
  // Es conserven els accents: és la paraula que es cercarà a ARASAAC.
  const list = (sentence.toLocaleLowerCase().match(/[\p{L}\p{N}·]+/gu) ?? []).filter(
    (w) => w.length >= 4 && !stop.has(normalize(w)),
  );
  return list.sort((a, b) => b.length - a.length)[0] ?? '';
}
