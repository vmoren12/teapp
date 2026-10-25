// @ts-check
// <tea-picto source="arasaac" picto-id="2742" alt="Entrar">
// Web Component que mostra un pictograma resolent-lo a la biblioteca local.
// Funciona igual al panell de control i a la projecció.

/** @typedef {import('../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../pictograms/library.js').PictoLibrary} PictoLibrary */

export class TeaPicto extends HTMLElement {
  /** Biblioteca compartida per tots els elements (s'assigna en arrencar). */
  /** @type {PictoLibrary | null} */
  static library = null;

  static observedAttributes = ['source', 'picto-id', 'alt'];

  /** Evita que una resolució antiga sobreescrigui una de nova. */
  #token = 0;

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  async #render() {
    const token = ++this.#token;
    const source = this.getAttribute('source');
    const id = this.getAttribute('picto-id') ?? '';
    const alt = this.getAttribute('alt') ?? '';
    if ((source !== 'arasaac' && source !== 'local') || !id || !TeaPicto.library) {
      this.replaceChildren();
      return;
    }
    const url = await TeaPicto.library.resolve({ source, id, alt });
    if (token !== this.#token) return;
    if (!url) {
      this.dataset.missing = '';
      this.replaceChildren();
      return;
    }
    delete this.dataset.missing;
    let img = this.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.decoding = 'async';
      img.draggable = false;
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        this.dataset.missing = '';
      });
      this.append(img);
    }
    img.alt = alt;
    if (img.src !== url) img.src = url;
  }
}

if (!customElements.get('tea-picto')) customElements.define('tea-picto', TeaPicto);

/**
 * Crea un <tea-picto>. Amb `decorative`, el text alternatiu queda buit perquè
 * el nom ja apareix al costat (així els lectors de pantalla no el repeteixen).
 * @param {PictoRef} ref
 * @param {{ decorative?: boolean, className?: string }} [options]
 */
export function pictoElement(ref, { decorative = false, className = '' } = {}) {
  const el = /** @type {TeaPicto} */ (document.createElement('tea-picto'));
  el.setAttribute('source', ref.source);
  el.setAttribute('picto-id', ref.id);
  el.setAttribute('alt', decorative ? '' : ref.alt);
  if (className) el.className = className;
  return el;
}
