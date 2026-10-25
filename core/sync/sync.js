// @ts-check
// Sincronització entre el panell de control (amfitrió, l'única font de veritat)
// i les finestres de projecció (rèpliques, només lectura).
//
// Protocol:
//   rèplica → hello      Demana l'estat complet (en obrir-se).
//   amfitrió → state     Estat complet + revisió. S'envia a cada canvi.
//   amfitrió → ping      Cada pocs segons; la rèplica respon pong.
//   amfitrió → transient Valor efímer d'un mòdul (p. ex. el nivell del sonòmetre).
//                        No forma part de l'estat: no es desa ni té revisió.
//   rèplica → command    Una acció (p. ex. tecla premuda a la projecció).
//   rèplica → bye        En tancar-se.
//   amfitrió → host-hello / host-present / host-bye   Detecta panells duplicats.
//
// L'estat és petit (pocs kB) i només canvia per accions del docent, així que
// enviar-lo sencer és més simple i robust que enviar diferències.

import { newId } from '../id.js';

/** @typedef {import('../types.js').SharedState} SharedState */
/** @typedef {import('../types.js').Action} Action */
/** @typedef {import('./transport.js').SyncTransport} SyncTransport */

/**
 * @typedef {{ type: 'hello', id: string }
 *   | { type: 'pong', id: string }
 *   | { type: 'bye', id: string }
 *   | { type: 'command', id: string, action: Action }
 *   | { type: 'state', hostId: string, rev: number, state: SharedState }
 *   | { type: 'ping', hostId: string }
 *   | { type: 'transient', hostId: string, module: string, value: unknown }
 *   | { type: 'host-hello', hostId: string }
 *   | { type: 'host-present', hostId: string }
 *   | { type: 'host-bye', hostId: string }} SyncMessage
 */

const PING_MS = 4000;
const PEER_TIMEOUT_MS = 10000;

/**
 * @param {{
 *   transport: SyncTransport,
 *   getState: () => SharedState,
 *   onCommand: (action: Action) => void,
 *   onPeersChange?: (count: number) => void,
 *   onDuplicateHost?: () => void,
 *   now?: () => number,
 * }} options
 */
export function startHost({
  transport,
  getState,
  onCommand,
  onPeersChange = () => {},
  onDuplicateHost = () => {},
  now = Date.now,
}) {
  const hostId = newId();
  let rev = 0;
  /** @type {Map<string, number>} id de rèplica → darrer cop que l'hem vista */
  const peers = new Map();

  const notifyPeers = () => onPeersChange(peers.size);
  /** @param {string} id */
  const seen = (id) => {
    const isNew = !peers.has(id);
    peers.set(id, now());
    if (isNew) notifyPeers();
  };

  const broadcast = () => transport.send({ type: 'state', hostId, rev: ++rev, state: getState() });

  const off = transport.onMessage((msg) => {
    switch (msg.type) {
      case 'hello':
        seen(msg.id);
        broadcast();
        break;
      case 'pong':
        seen(msg.id);
        break;
      case 'bye':
        if (peers.delete(msg.id)) notifyPeers();
        break;
      case 'command':
        seen(msg.id);
        onCommand(msg.action);
        break;
      case 'host-hello':
        if (msg.hostId !== hostId) {
          transport.send({ type: 'host-present', hostId });
          onDuplicateHost();
        }
        break;
      case 'host-present':
        if (msg.hostId !== hostId) onDuplicateHost();
        break;
    }
  });

  const timer = setInterval(() => {
    transport.send({ type: 'ping', hostId });
    const limit = now() - PEER_TIMEOUT_MS;
    let changed = false;
    for (const [id, last] of peers) {
      if (last < limit) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed) notifyPeers();
  }, PING_MS);

  transport.send({ type: 'host-hello', hostId });

  return {
    hostId,
    /** Envia l'estat actual a totes les rèpliques. */
    broadcast,
    /** @param {string} module @param {unknown} value */
    sendTransient: (module, value) => transport.send({ type: 'transient', hostId, module, value }),
    peerCount: () => peers.size,
    stop() {
      clearInterval(timer);
      transport.send({ type: 'host-bye', hostId });
      off();
    },
  };
}

/**
 * @param {{
 *   transport: SyncTransport,
 *   onState: (state: SharedState) => void,
 *   onTransient?: (module: string, value: unknown) => void,
 *   onHostGone?: () => void,
 * }} options
 */
export function startReplica({
  transport,
  onState,
  onTransient = () => {},
  onHostGone = () => {},
}) {
  const id = newId();
  /** @type {string | null} */
  let hostId = null;
  let lastRev = 0;

  const off = transport.onMessage((msg) => {
    switch (msg.type) {
      case 'state':
        // Si el panell s'ha recarregat, les revisions tornen a començar.
        if (msg.hostId !== hostId) {
          hostId = msg.hostId;
          lastRev = 0;
        }
        if (msg.rev > lastRev) {
          lastRev = msg.rev;
          onState(msg.state);
        }
        break;
      case 'transient':
        if (msg.hostId === hostId) onTransient(msg.module, msg.value);
        break;
      case 'ping':
        transport.send({ type: 'pong', id });
        if (msg.hostId !== hostId) transport.send({ type: 'hello', id });
        break;
      case 'host-hello':
        transport.send({ type: 'hello', id });
        break;
      case 'host-bye':
        if (msg.hostId === hostId) {
          hostId = null;
          onHostGone();
        }
        break;
    }
  });

  transport.send({ type: 'hello', id });

  return {
    id,
    /** @param {Action} action */
    sendCommand: (action) => transport.send({ type: 'command', id, action }),
    stop() {
      transport.send({ type: 'bye', id });
      off();
    },
  };
}
