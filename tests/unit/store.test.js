// @ts-check
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../core/store.js';
import { share } from '../../core/share.js';

describe('createStore', () => {
  it('notifica els subscriptors amb l’estat nou i l’anterior', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ a: 2 });
    expect(listener).toHaveBeenCalledWith({ a: 2 }, { a: 1 });
    expect(store.getState()).toEqual({ a: 2 });
  });

  it('accepta una funció i no notifica si l’estat no canvia', () => {
    const initial = { a: 1 };
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((s) => s);
    expect(listener).not.toHaveBeenCalled();
    store.setState((s) => ({ a: s.a + 1 }));
    expect(store.getState().a).toBe(2);
  });

  it('permet donar-se de baixa', () => {
    const store = createStore(0);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.setState(1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('share (compartició estructural)', () => {
  it('reaprofita els subarbres iguals', () => {
    const prev = { a: { x: 1 }, b: [1, 2], c: 'hola' };
    const next = share(prev, { a: { x: 1 }, b: [1, 3], c: 'hola' });
    expect(next.a).toBe(prev.a);
    expect(next.b).not.toBe(prev.b);
  });

  it('retorna l’objecte anterior si tot és igual', () => {
    const prev = { a: { x: [1, { y: 2 }] } };
    expect(share(prev, structuredClone(prev))).toBe(prev);
  });

  it('detecta claus eliminades', () => {
    const prev = { a: 1, b: 2 };
    expect(share(prev, { a: 1 })).toEqual({ a: 1 });
  });
});
