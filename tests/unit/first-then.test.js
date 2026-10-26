// @ts-check
import { describe, expect, it } from 'vitest';
import {
  boardOf,
  firstThenActions as F,
  initialFirstThen,
  sanitizeContent,
} from '../../modules/first-then/logic.js';
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

  it('per defecte segueix l’agenda i canvia sol en avançar d’activitat', () => {
    const data = appData();
    const s = initialFirstThen(undefined);
    expect(s.follow).toBe(true);
    const acts = data.live.modules.agenda.activities;
    expect(boardOf(s, data.live)).toMatchObject({
      first: { label: acts[0].label },
      then: { label: acts[1].label },
      follow: true,
    });
    const agenda = agendaActions.next(data.live.modules.agenda, null, env(0));
    const live = { ...data.live, modules: { ...data.live.modules, agenda } };
    expect(boardOf(s, live).first.label).toBe(acts[1].label);
    expect(boardOf(s, live).then.label).toBe(acts[2].label);
  });

  it('seguint l’agenda, «fet» val només per a l’activitat en què es marca', () => {
    const data = appData();
    const s = F.setDone(initialFirstThen(undefined), { done: true }, env(0, data.live));
    expect(boardOf(s, data.live).firstDone).toBe(true);
    const agenda = agendaActions.next(data.live.modules.agenda, null, env(0));
    const live = { ...data.live, modules: { ...data.live.modules, agenda } };
    expect(boardOf(s, live).firstDone).toBe(false);
  });

  it('editar una casella deixa de seguir l’agenda i es pot tornar a seguir', () => {
    const data = appData();
    const acts = data.live.modules.agenda.activities;
    let s = F.setCard(
      initialFirstThen(undefined),
      { slot: 'then', patch: { label: 'Pati' } },
      env(0, data.live),
    );
    expect(s).toMatchObject({
      follow: false,
      first: { label: acts[0].label },
      then: { label: 'Pati' },
    });
    s = F.setFollow(s, { follow: true }, env(0, data.live));
    expect(boardOf(s, data.live).then.label).toBe(acts[1].label);
  });

  it('les caselles omplertes a mà d’abans no passen a seguir l’agenda', () => {
    expect(sanitizeContent({ first: { label: 'Fitxa' } }).follow).toBe(false);
    expect(sanitizeContent({}).follow).toBe(true);
    expect(sanitizeContent({ follow: false }).follow).toBe(false);
  });
});
