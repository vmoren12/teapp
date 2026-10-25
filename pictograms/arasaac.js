// @ts-check
// Client de l'API d'ARASAAC (https://arasaac.org).
// Privacitat: només s'envia el terme de cerca. Les peticions es fan sense
// galetes ni capçalera Referer.
//
// Pictogrames: Sergio Palao. Origen: ARASAAC. Llicència: CC BY-NC-SA 4.0.
// Propietat: Govern d'Aragó.

const API = 'https://api.arasaac.org/v1/pictograms';
const STATIC = 'https://static.arasaac.org/pictograms';

/** @type {RequestInit} */
export const FETCH_OPTIONS = { credentials: 'omit', referrerPolicy: 'no-referrer' };

/** @typedef {{ id: string, label: string }} ArasaacResult */

/**
 * @param {string} id
 * @param {300 | 500} [size]
 */
export function arasaacImageUrl(id, size = 300) {
  return `${STATIC}/${id}/${id}_${size}.png`;
}

/**
 * Cerca pictogrames. Retorna [] si no n'hi ha (l'API respon 404 en aquest cas).
 * @param {string} term
 * @param {string} locale
 * @param {{ signal?: AbortSignal, limit?: number }} [options]
 * @returns {Promise<ArasaacResult[]>}
 */
export async function searchArasaac(term, locale, { signal, limit = 40 } = {}) {
  const query = term.trim();
  if (!query) return [];
  const url = `${API}/${encodeURIComponent(locale)}/search/${encodeURIComponent(query)}`;
  const res = await fetch(url, { ...FETCH_OPTIONS, signal });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`ARASAAC: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).flatMap((item) => {
    const id = Number(item?._id);
    if (!Number.isInteger(id)) return [];
    const keyword = item?.keywords?.[0]?.keyword;
    return [{ id: String(id), label: typeof keyword === 'string' ? keyword : query }];
  });
}
