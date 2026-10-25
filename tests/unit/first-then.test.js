// @ts-check
import { describe, expect, it } from 'vitest';
import { firstThenActions as F, initialFirstThen } from '../../modules/first-then/logic.js';
import { agendaActions } from '../../modules/agenda/logic.js';
import { appData, env } from './helpers.js';

describe('Primer → Després', () => {
  it('edita una casella i valida el pictograma', () => {
    let s = F.setCard(
      initialFirstThen(undefined),
      { slot: 'first', patch: { label: 'Fitxa' } },
      env(0),
    );
    s = F.setCard(
      s,
      {
        slot: 'then',
        patch: { label: 'Pati', picto: { source: 'arasaac', id: '6204', alt: 'Pati' } },
      },
      env(0),
    );
    expect(s.first.label).toBe('Fitxa');
    expect(s.then.picto?.id).toBe('6204');
    expect(F.setCard(s, { slot: 'altre', patch: {} }, env(0))).toBe(s);
  });

  it('avança: «després» passa a «primer»', () => {
    let s = F.setCard(
      initialFirstThen(undefined),
      { slot: 'then', patch: { label: 'Pati' } },
      env(0),
    );
    s = F.setDone(s, { done: true }, env(0));
    s = F.advance(s, null, env(0));
    expect(s).toMatchObject({ first: { label: 'Pati' }, then: { label: '' }, firstDone: false });
  });

  it('s’omple amb l’activitat actual i la següent', () => {
    const data = appData();
    const agenda = agendaActions.next(data.live.modules.agenda, null, env(0));
    const live = { ...data.live, modules: { ...data.live.modules, agenda } };
    const s = F.fromAgenda(initialFirstThen(undefined), null, env(0, live));
    expect(s.first.label).toBe(agenda.activities[1].label);
    expect(s.then.label).toBe(agenda.activities[2].label);
  });
});
