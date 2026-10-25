// @ts-check
// Amaga el cursor quan no es mou: a la projecció no ha de distreure.

/**
 * @param {HTMLElement} el
 * @param {number} [delayMs]
 * @returns {() => void}
 */
export function hideIdleCursor(el, delayMs = 2000) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const wake = () => {
    el.classList.remove('is-idle');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.add('is-idle'), delayMs);
  };
  el.addEventListener('pointermove', wake);
  el.addEventListener('pointerdown', wake);
  wake();
  return () => {
    clearTimeout(timer);
    el.removeEventListener('pointermove', wake);
    el.removeEventListener('pointerdown', wake);
  };
}
