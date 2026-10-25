// @ts-check
import { describe, expect, it } from 'vitest';
import { agendaActions as A, initialAgenda, MAX_ACTIVITIES } from '../../modules/agenda/logic.js';
import { splitAgendaText } from '../../modules/agenda/suggest.js';
import { timeRows } from '../../modules/agenda/time.js';
import { parseList } from '../../modules/story/suggest.js';
import { timerActions, timerView, initialTimer } from '../../modules/timer/logic.js';
import ca from '../../i18n/ca.json';
import { activity, env, fakeT } from './helpers.js';

const MIN = 60_000;
const words = {
  connectors: parseList(ca.agenda.suggest.connectors),
  separators: ca.agenda.suggest.separators.split(',').map((x) => x.trim()),
};

describe('«Escriu l’agenda»', () => {
  it('fa una activitat per tros, amb la durada si s’escriu', () => {
    const text =
      'Entrada i salutació 5 min, explicació 15 min, treball en grup i després pati. Recollir.';
    expect(splitAgendaText(text, words)).toEqual([
      { label: 'Entrada i salutació', durationMin: 5 },
      { label: 'Explicació', durationMin: 15 },
      { label: 'Treball en grup', durationMin: null },
      { label: 'Pati', durationMin: null },
      { label: 'Recollir', durationMin: null },
    ]);
  });

  it('entén llistes, connectors inicials i altres maneres d’escriure els minuts', () => {
    const text =
      "1. Primer, entrada (10')\n2) Després esmorzar 20 minuts\n- Tema 3\nFinalment recollir";
    expect(splitAgendaText(text, words)).toEqual([
      { label: 'Entrada', durationMin: 10 },
      { label: 'Esmorzar', durationMin: 20 },
      // Un número sense unitat forma part del nom.
      { label: 'Tema 3', durationMin: null },
      { label: 'Recollir', durationMin: null },
    ]);
    expect(splitAgendaText('  ,\n . ', words)).toEqual([]);
  });

  it('afegeix les activitats de cop o substitueix les actuals', () => {
    const s = A.start(initialAgenda({ activities: [activity({ id: 'a' })] }), null, env(1000));
    const incoming = [activity({ id: 'x' }), activity({ id: 'y' })];
    const ids = (/** @type {{ activities: { id: string }[] }} */ x) =>
      x.activities.map((a) => a.id);
    const added = A.addMany(s, { activities: incoming }, env(2000));
    expect(ids(added)).toEqual(['a', 'x', 'y']);
    expect(added.startedAt).toBe(1000);

    const replaced = A.addMany(s, { activities: incoming, replace: true }, env(2000));
    expect(ids(replaced)).toEqual(['x', 'y']);
    expect(replaced.currentIndex).toBe(0);
    expect(replaced.startedAt).toBeNull();

    const many = Array.from({ length: MAX_ACTIVITIES + 5 }, () => activity());
    expect(A.addMany(s, { activities: many }, env(0)).activities).toHaveLength(MAX_ACTIVITIES);
    expect(A.addMany(s, { activities: [] }, env(0))).toBe(s);
  });
});

describe('barres de temps sota els pictogrames', () => {
  const agenda = () =>
    A.start(
      initialAgenda({
        activities: [
          activity({ id: 'a', durationMin: 5 }),
          activity({ id: 'b', durationMin: 10 }),
          activity({ id: 'c', durationMin: 15 }),
        ],
      }),
      null,
      env(0),
    );
  const base = { timer: null, timerLabel: '', minutes: true, t: fakeT };

  it('l’actual s’esgota; les fetes, buides; les que vénen, plenes amb la durada', () => {
    const s = A.next(agenda(), null, env(0)); // ara: «b», des de 0
    const now = 4 * MIN;
    const [done] = timeRows({ ...base, agenda: s, index: 0, now });
    const [current] = timeRows({ ...base, agenda: s, index: 1, now });
    const [later] = timeRows({ ...base, agenda: s, index: 2, now });
    expect(done).toMatchObject({ progress: 0, text: '' });
    expect(current.progress).toBeCloseTo(0.6);
    expect(current.text).toBe('timer.minutesLeft:{"count":6}');
    expect(later).toMatchObject({ progress: 1, text: 'agenda.time.duration:{"count":15}' });
    // Sense minuts: només la barra.
    expect(timeRows({ ...base, minutes: false, agenda: s, index: 1, now })[0].text).toBe('');
  });

  it('a l’actual hi surt també el temporitzador si en porta un de propi en marxa', () => {
    const s = agenda();
    const live = /** @type {any} */ ({ modules: { agenda: s } });
    const running = timerActions.start(initialTimer(), null, env(0, live));
    const rows = timeRows({
      ...base,
      agenda: s,
      index: 0,
      timer: timerView(running, live),
      timerLabel: 'Fitxa',
      now: MIN,
    });
    expect(rows.map((r) => r.kind)).toEqual(['activity', 'timer']);
    expect(rows[1].text).toBe('Fitxa · timer.minutesLeft:{"count":4}');
    // Un temporitzador sense començar no hi surt; a les altres targetes, tampoc.
    const idle = timerView(initialTimer(), live);
    expect(timeRows({ ...base, agenda: s, index: 0, timer: idle, now: MIN })).toHaveLength(1);
    expect(
      timeRows({ ...base, agenda: s, index: 1, timer: timerView(running, live), now: MIN }),
    ).toHaveLength(1);
  });
});
