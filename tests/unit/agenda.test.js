// @ts-check
import { describe, expect, it } from 'vitest';
import { agendaActions as A, initialAgenda, sanitizeState } from '../../modules/agenda/logic.js';
import {
  currentActivity,
  endsAt,
  isFinished,
  nextActivity,
  remainingMs,
  statusOf,
} from '../../modules/agenda/selectors.js';
import { activity, env } from './helpers.js';

/** @typedef {import('../../modules/agenda/logic.js').AgendaState} AgendaState */

const MIN = 60_000;

/** @returns {AgendaState} */
function agenda() {
  return initialAgenda({
    activities: [
      activity({ id: 'a', label: 'A', durationMin: 5 }),
      activity({ id: 'b', label: 'B', durationMin: 10 }),
      activity({ id: 'c', label: 'C', durationMin: 15 }),
    ],
  });
}

describe('agenda: navegació i temps', () => {
  it('comença, avança i calcula el temps restant', () => {
    let s = A.start(agenda(), null, env(1000));
    expect(s.startedAt).toBe(1000);
    expect(remainingMs(s, 1000 + 2 * MIN)).toBe(3 * MIN);
    s = A.next(s, null, env(5000));
    expect(currentActivity(s)?.id).toBe('b');
    expect(nextActivity(s)?.id).toBe('c');
    expect(s.startedAt).toBe(5000);
    expect(endsAt(s)).toBe(5000 + 10 * MIN);
  });

  it('marca fet / ara / després / més tard', () => {
    const s = A.next(agenda(), null, env(0));
    expect([0, 1, 2].map((i) => statusOf(s, i))).toEqual(['done', 'now', 'next']);
  });

  it('acaba la sessió en passar de l’última activitat', () => {
    let s = agenda();
    for (let i = 0; i < 5; i++) s = A.next(s, null, env(i));
    expect(isFinished(s)).toBe(true);
    expect(s.currentIndex).toBe(3);
    expect(s.startedAt).toBeNull();
    expect(A.start(s, null, env(9)).currentIndex).toBe(0);
  });

  it('no retrocedeix abans de la primera', () => {
    const s = agenda();
    expect(A.prev(s, null, env(0))).toBe(s);
  });

  it('allarga el temps només si corre', () => {
    const s = agenda();
    expect(A.extend(s, { minutes: 5 }, env(0))).toBe(s);
    const running = A.extend(A.start(s, null, env(0)), { minutes: 5 }, env(0));
    expect(remainingMs(running, 0)).toBe(10 * MIN);
  });
});

describe('agenda: edició en directe', () => {
  it('insereix una targeta de canvi just després de l’actual', () => {
    /** @type {AgendaState} */
    const s = A.insertChange(
      A.next(agenda(), null, env(0)),
      { activity: { id: 'x', label: 'Canvi' } },
      env(0),
    );
    expect(s.activities.map((a) => a.id)).toEqual(['a', 'b', 'x', 'c']);
    expect(s.activities[2].kind).toBe('change');
    expect(currentActivity(s)?.id).toBe('b');
  });

  it('manté l’activitat actual en afegir abans, moure i eliminar', () => {
    let s = A.next(agenda(), null, env(0)); // actual: b
    s = A.add(s, { activity: { id: 'z', label: 'Z' }, at: 0 }, env(0));
    expect(currentActivity(s)?.id).toBe('b');
    s = A.move(s, { id: 'b', delta: -1 }, env(0));
    expect(currentActivity(s)?.id).toBe('b');
    s = A.remove(s, { id: 'z' }, env(0));
    expect(currentActivity(s)?.id).toBe('b');
  });

  it('valida les actualitzacions', () => {
    const s = agenda();
    const updated = A.update(
      s,
      { id: 'a', patch: { label: 'Nou', durationMin: 0, id: 'hack' } },
      env(0),
    );
    expect(updated.activities[0]).toMatchObject({ id: 'a', label: 'Nou', durationMin: 1 });
    expect(A.update(s, { id: 'no-existeix', patch: {} }, env(0))).toBe(s);
  });

  it('no deixa repetir id', () => {
    const s = agenda();
    expect(A.add(s, { activity: { id: 'a', label: 'dup' } }, env(0))).toBe(s);
  });
});

describe('agenda: dades desades', () => {
  it('corregeix un índex fora de rang', () => {
    const s = sanitizeState({ activities: [{ id: 'a' }], currentIndex: 10, startedAt: 'ahir' });
    expect(s.currentIndex).toBe(1);
    expect(s.startedAt).toBeNull();
  });
});
