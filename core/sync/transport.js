// @ts-check
// Transport de sincronització. La lògica de core/sync/sync.js només depèn
// d'aquesta interfície, de manera que es pot substituir BroadcastChannel
// (finestres del mateix navegador) per WebRTC o WebSocket (control des del
// mòbil) sense tocar res més.

/**
 * @typedef {Object} SyncTransport
 * @property {(message: import('./sync.js').SyncMessage) => void} send
 * @property {(handler: (message: import('./sync.js').SyncMessage) => void) => () => void} onMessage
 * @property {() => void} close
 */

/**
 * Transport entre pestanyes i finestres del mateix origen.
 * @param {string} name
 * @returns {SyncTransport}
 */
export function createBroadcastTransport(name) {
  if (typeof BroadcastChannel === 'undefined') return createNullTransport();
  const channel = new BroadcastChannel(name);
  return {
    send: (message) => channel.postMessage(message),
    onMessage(handler) {
      /** @param {MessageEvent} event */
      const listener = (event) => handler(event.data);
      channel.addEventListener('message', listener);
      return () => channel.removeEventListener('message', listener);
    },
    close: () => channel.close(),
  };
}

/** Transport que no fa res (navegadors sense BroadcastChannel). @returns {SyncTransport} */
export function createNullTransport() {
  return { send() {}, onMessage: () => () => {}, close() {} };
}

/**
 * Parell de transports connectats en memòria (per als tests).
 * @returns {[SyncTransport, SyncTransport]}
 */
export function createMemoryTransportPair() {
  /** @type {Set<(m: any) => void>[]} */
  const sides = [new Set(), new Set()];
  /** @param {number} self @returns {SyncTransport} */
  const make = (self) => ({
    send: (message) => {
      for (const handler of sides[1 - self]) handler(structuredClone(message));
    },
    onMessage(handler) {
      sides[self].add(handler);
      return () => sides[self].delete(handler);
    },
    close: () => sides[self].clear(),
  });
  return [make(0), make(1)];
}
