// @ts-check
// Missatges breus de confirmació («Plantilla desada»). S'anuncien també als
// lectors de pantalla mitjançant una regió aria-live.

import { h } from '../core/dom.js';

/**
 * @param {HTMLElement} root
 * @returns {(message: string) => void}
 */
export function createAnnouncer(root) {
  const region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
  root.append(region);
  return (message) => {
    const item = h('p', { class: 'toast' }, message);
    region.append(item);
    setTimeout(() => item.remove(), 4000);
  };
}
