// @ts-check

/** Genera un identificador únic. */
export function newId() {
  // randomUUID només existeix en contextos segurs (https o localhost).
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
