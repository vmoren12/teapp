// @ts-check
// «Escriu l'agenda»: el docent escriu les activitats seguides («Entrada,
// explicació 15 min, treball en grup i després pati») i se'n fa una activitat
// per tros, amb pictograma suggerit (vegeu shared/suggest-pictos.js).
// Lògica pura: separar el text, treure'n els connectors i les durades.

import { normalize } from '../story/suggest.js';
import { MAX_DURATION, MIN_DURATION } from './logic.js';

/**
 * @typedef {Object} AgendaPiece
 * @property {string} label
 * @property {number | null} durationMin  Durada escrita al text («15 min»), si n'hi ha.
 */

// «15 min», «15 minuts», «15'», «15 m». Els números sols no compten: poden ser
// part del nom («Tema 3»).
const DURATION =
  /\(?\s*(\d{1,3})\s*(?:min(?:uts?|utos?|utes?|s)?\.?|m|['’])(?![\p{L}\p{N}])\s*\)?/iu;

/** @param {string} value */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divideix el text en activitats: salts de línia, punts, punt i coma, comes i
 * connectors entre activitats («i després»). Treu els connectors inicials
 * («primer», «després»…) i la durada.
 * @param {string} text
 * @param {{ connectors: string[], separators: string[] }} words
 *   connectors: normalitzats (vegeu story/suggest.js › parseList), es treuen a
 *   l'inici de cada activitat. separators: tal com s'escriuen, parteixen el text.
 * @returns {AgendaPiece[]}
 */
export function splitAgendaText(text, { connectors, separators }) {
  // Primer els més llargs: «i després» abans que «després».
  const byLength = (/** @type {string} */ a, /** @type {string} */ b) => b.length - a.length;
  const ordered = [...connectors].sort(byLength);
  const alternatives = [...separators].sort(byLength).map(escapeRegExp).join('|');
  const middle = alternatives ? new RegExp(`\\s+(?:${alternatives})\\s+`, 'iu') : null;
  return text
    .normalize('NFC')
    .replace(/\r/g, '')
    .split(/\n+|[;,]|(?<=[.!?…])\s+/)
    .flatMap((piece) => (middle ? piece.split(middle) : [piece]))
    .map((raw) => {
      let label = raw.trim();
      const match = label.match(DURATION);
      const minutes = match ? Number(match[1]) : null;
      if (match) label = label.replace(match[0], ' ');
      // Pics i numeració de llista («- », «1. », «2) »).
      label = label.trim().replace(/^(?:[-•*]|\d{1,2}[.)])\s*/u, '');
      label = label
        .replace(/[.!?…:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      label = stripConnectors(label, ordered);
      return {
        label: label.charAt(0).toLocaleUpperCase() + label.slice(1),
        durationMin: minutes && minutes >= MIN_DURATION ? Math.min(minutes, MAX_DURATION) : null,
      };
    })
    .filter((piece) => /[\p{L}\p{N}]/u.test(piece.label));
}

/** @param {string} label @param {string[]} connectors */
function stripConnectors(label, connectors) {
  let out = label;
  for (let guard = 0; guard < 4; guard++) {
    const lower = normalize(out);
    const hit = connectors.find((c) => lower === c || lower.startsWith(`${c} `));
    if (!hit) break;
    // normalize() conserva la llargada del text (en forma NFC).
    out = out.slice(hit.length).replace(/^[\s,:]+/, '');
  }
  return out;
}
