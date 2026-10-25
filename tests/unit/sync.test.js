// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryTransportPair } from '../../core/sync/transport.js';
import { startHost, startReplica } from '../../core/sync/sync.js';
import { appData } from './helpers.js';

describe('sincronització entre finestres', () => {
  /** @type {(() => void)[]} */
  const cleanup = [];
  afterEach(() => cleanup.splice(0).forEach((fn) => fn()));

  it('la projecció rep l’estat en connectar-se i a cada canvi', () => {
    const [hostSide, replicaSide] = createMemoryTransportPair();
    const data = appData();
    let shared = { settings: data.settings, live: data.live };
    const host = startHost({ transport: hostSide, getState: () => shared, onCommand: () => {} });
    cleanup.push(host.stop);
    const onState = vi.fn();
    const replica = startReplica({ transport: replicaSide, onState });
    cleanup.push(replica.stop);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls[0][0].live.stage).toBe('agenda');

    shared = { ...shared, live: { ...shared.live, stage: 'timer' } };
    host.broadcast();
    expect(onState).toHaveBeenCalledTimes(2);
    expect(onState.mock.calls[1][0].live.stage).toBe('timer');
  });

  it('les tecles de la projecció arriben al panell com a accions', () => {
    const [hostSide, replicaSide] = createMemoryTransportPair();
    const data = appData();
    const onCommand = vi.fn();
    const onPeersChange = vi.fn();
    const host = startHost({ transport: hostSide, getState: () => data, onCommand, onPeersChange });
    cleanup.push(host.stop);
    const replica = startReplica({ transport: replicaSide, onState: () => {} });
    replica.sendCommand({ module: 'agenda', type: 'next' });
    expect(onCommand).toHaveBeenCalledWith({ module: 'agenda', type: 'next' });
    expect(host.peerCount()).toBe(1);
    replica.stop();
    expect(host.peerCount()).toBe(0);
    expect(onPeersChange).toHaveBeenLastCalledWith(0);
  });

  it('els valors efímers arriben a la projecció sense passar per l’estat', () => {
    const [hostSide, replicaSide] = createMemoryTransportPair();
    const data = appData();
    const host = startHost({ transport: hostSide, getState: () => data, onCommand: () => {} });
    cleanup.push(host.stop);
    const onState = vi.fn();
    const onTransient = vi.fn();
    const replica = startReplica({ transport: replicaSide, onState, onTransient });
    cleanup.push(replica.stop);
    host.sendTransient('noise', { active: true, level: 1.5 });
    expect(onTransient).toHaveBeenCalledWith('noise', { active: true, level: 1.5 });
    expect(onState).toHaveBeenCalledTimes(1);
  });

  it('avisa la projecció quan el panell es tanca', () => {
    const [hostSide, replicaSide] = createMemoryTransportPair();
    const data = appData();
    const host = startHost({ transport: hostSide, getState: () => data, onCommand: () => {} });
    const onHostGone = vi.fn();
    const replica = startReplica({ transport: replicaSide, onState: () => {}, onHostGone });
    cleanup.push(replica.stop);
    host.stop();
    expect(onHostGone).toHaveBeenCalled();
  });
});
