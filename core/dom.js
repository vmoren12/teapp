// @ts-check
// Utilitats de DOM. Tot el text de l'usuari s'insereix com a nodes de text
// (mai amb innerHTML), de manera que no hi pot haver injecció d'HTML.

/** @typedef {Node | string | number | null | undefined | false} Child */

/**
 * Crea un element amb atributs i fills.
 * - `class`: className
 * - `dataset`: objecte per a data-*
 * - `onX`: escoltador d'esdeveniments (p. ex. onClick)
 * - `true`: atribut booleà; `false`/null/undefined: s'omet.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any> | null} [props]
 * @param {...(Child | Child[])} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

/**
 * @param {Element} el
 * @param {(Child | Child[])[]} children
 */
export function append(el, children) {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
}

/**
 * Text visible només per a lectors de pantalla.
 * @param {string} text
 */
export function srOnly(text) {
  return h('span', { class: 'sr-only' }, text);
}

/**
 * Cert si l'usuari està escrivint en un camp de text (les dreceres no s'han d'activar).
 * @param {EventTarget | null} target
 */
export function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
      target.type,
    );
  }
  return false;
}

/**
 * Cert si l'element ja fa servir Espai, Retorn o les fletxes per a ell mateix.
 * @param {EventTarget | null} target
 */
export function isInteractiveTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  if (target.closest('button, a[href], input, select, summary')) return true;
  const role = target.getAttribute('role');
  return role === 'tab' || role === 'radio' || role === 'slider' || role === 'option';
}
