// @ts-check
// Store mínim amb patró pub/sub. L'estat és immutable: cada canvi crea un objecte
// nou, i els subscriptors poden comparar referències per saber què ha canviat.

/**
 * @template S
 * @typedef {Object} Store
 * @property {() => S} getState
 * @property {(next: S | ((prev: S) => S)) => void} setState
 * @property {(listener: (state: S, prev: S) => void) => () => void} subscribe
 */

/**
 * @template S
 * @param {S} initial
 * @returns {Store<S>}
 */
export function createStore(initial) {
  let state = initial;
  /** @type {Set<(state: S, prev: S) => void>} */
  const listeners = new Set();

  return {
    getState: () => state,
    setState(next) {
      const value = typeof next === 'function' ? /** @type {(prev: S) => S} */ (next)(state) : next;
      if (Object.is(value, state)) return;
      const prev = state;
      state = value;
      // Còpia de la llista: un subscriptor es pot donar de baixa mentre notifiquem.
      for (const listener of [...listeners]) listener(state, prev);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
