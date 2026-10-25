// @ts-check
// Mòduls de la Fase 2: instruccions, expectatives, sonòmetre i torns.
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import { activeSteps, sanitizeState as sanitizeSteps } from '../../modules/steps/logic.js';
import { activeBoard } from '../../modules/expectations/logic.js';
import { dbToLevel, overLimit, rmsDb, smooth } from '../../modules/noise/meter.js';
import { noiseLimit, sanitizeReading } from '../../modules/noise/logic.js';
import {
  isPermutation,
  nowAndNext,
  randomOrder,
  sanitizeState as sanitizeTurns,
} from '../../modules/turns/logic.js';
import turnsModule from '../../modules/turns/index.js';
import { hasPrivateData, withoutPrivateData } from '../../core/io.js';
import { GENERAL } from '../../modules/shared/items.js';
import { appData, registry } from './helpers.js';

/** @param {any} state @param {string} module @param {string} type @param {any} [payload] */
const act = (state, module, type, payload) =>
  reduce(state, { module, type, payload }, { now: 1000, registry });

const ids = (/** @type {any} */ data) =>
  data.live.modules.agenda.activities.map((/** @type {any} */ a) => a.id);

describe('instruccions pas a pas', () => {
  /** @param {any} data @param {string} key @param {string[]} labels */
  const withSteps = (data, key, labels) =>
    labels.reduce(
      (s, label, i) =>
        act(s, 'steps', 'add', { key, item: { id: `${key}-${i}`, label, picto: null } }),
      data,
    );

  it('avança i retrocedeix; els passos fets es mantenen', () => {
    let s = withSteps(appData(), GENERAL, ['Obre', 'Llegeix', 'Respon']);
    s = act(s, 'steps', 'next');
    s = act(s, 'steps', 'next');
    let view = activeSteps(s.live.modules.steps, s.live);
    expect(view.index).toBe(2);
    expect(view.steps.map((x) => x.label)).toEqual(['Obre', 'Llegeix', 'Respon']);
    s = act(s, 'steps', 'next');
    s = act(s, 'steps', 'next'); // no passa de «tots fets»
    expect(activeSteps(s.live.modules.steps, s.live).index).toBe(3);
    s = act(s, 'steps', 'prev');
    expect(activeSteps(s.live.modules.steps, s.live).index).toBe(2);
    s = act(s, 'steps', 'restart');
    view = activeSteps(s.live.modules.steps, s.live);
    expect(view.index).toBe(0);
  });

  it('cada activitat pot tenir les seves i es carreguen soles en començar-la', () => {
    let s = withSteps(appData(), GENERAL, ['General']);
    const [first, second] = ids(s);
    s = act(s, 'steps', 'createOwn', { key: second });
    s = act(s, 'steps', 'update', { key: second, id: `${GENERAL}-0`, patch: { label: 'Propi' } });
    s = act(s, 'steps', 'next');
    expect(activeSteps(s.live.modules.steps, s.live)).toMatchObject({ key: GENERAL, index: 1 });

    // L'agenda passa a la segona activitat: es mostren els seus passos, des del primer.
    s = act(s, 'agenda', 'start');
    s = act(s, 'agenda', 'next');
    const view = activeSteps(s.live.modules.steps, s.live);
    expect(view.key).toBe(second);
    expect(view.index).toBe(0);
    expect(view.steps[0].label).toBe('Propi');
    expect(s.live.modules.steps.general[0].label).toBe('General');
    expect(first).not.toBe(second);
  });

  it('no crea contingut per a activitats inexistents i neteja les esborrades', () => {
    let s = act(appData(), 'steps', 'createOwn', { key: 'no-existeix' });
    expect(s.live.modules.steps.byActivity).toEqual({});
    const [, second] = ids(s);
    s = act(s, 'steps', 'createOwn', { key: second });
    s = act(s, 'agenda', 'remove', { id: second });
    s = withSteps(s, GENERAL, ['x']);
    expect(Object.keys(s.live.modules.steps.byActivity)).toEqual([]);
  });

  it('valida l’estat desat', () => {
    const s = sanitizeSteps({
      general: [{ id: 'a', label: 'Hola' }, { label: 'sense id' }],
      cursor: 'x',
    });
    expect(s.general).toHaveLength(1);
    expect(s.cursor).toEqual({ key: GENERAL, index: 0 });
  });
});

describe('expectatives', () => {
  it('omple el tauler i n’aplica un de predefinit', () => {
    let s = act(appData(), 'expectations', 'setAnswer', {
      key: GENERAL,
      field: 'where',
      patch: { label: 'Al meu lloc' },
    });
    s = act(s, 'expectations', 'setVoice', { key: GENERAL, level: 1 });
    let board = activeBoard(s.live.modules.expectations, s.live).board;
    expect(board.where.label).toBe('Al meu lloc');
    expect(board.voice).toBe(1);
    s = act(s, 'expectations', 'setVoice', { key: GENERAL, level: 9 });
    expect(s.live.modules.expectations.general.voice).toBeNull();
    s = act(s, 'expectations', 'apply', {
      key: GENERAL,
      board: {
        where: { label: 'Parella' },
        voice: 2,
        need: {},
        when: { label: 'Fi', timer: true },
      },
    });
    board = activeBoard(s.live.modules.expectations, s.live).board;
    expect(board).toMatchObject({ voice: 2, when: { label: 'Fi', timer: true } });
  });

  it('una activitat amb expectatives pròpies les mostra quan és l’actual', () => {
    let s = act(appData(), 'expectations', 'setVoice', { key: GENERAL, level: 0 });
    const [first] = ids(s);
    s = act(s, 'expectations', 'createOwn', { key: first });
    s = act(s, 'expectations', 'setVoice', { key: first, level: 3 });
    expect(activeBoard(s.live.modules.expectations, s.live)).toMatchObject({
      key: first,
      board: { voice: 3 },
    });
    s = act(s, 'expectations', 'removeOwn', { key: first });
    expect(activeBoard(s.live.modules.expectations, s.live).board.voice).toBe(0);
  });
});

describe('sonòmetre', () => {
  it('calcula el volum i el converteix a l’escala de veu', () => {
    expect(rmsDb(new Float32Array(128))).toBe(-120);
    expect(rmsDb(new Float32Array(128).fill(1))).toBeCloseTo(0);
    expect(dbToLevel(-58, -58, 3)).toBe(0);
    expect(dbToLevel(-42, -58, 3)).toBe(2);
    expect(dbToLevel(0, -58, 3)).toBe(4.5);
    // Més sensibilitat: el mateix so dona un nivell més alt.
    expect(dbToLevel(-48, -58, 5)).toBeGreaterThan(dbToLevel(-48, -58, 1));
  });

  it('el moviment és esmorteït i el color canvia de manera gradual', () => {
    expect(smooth(0, 4)).toBeCloseTo(0.6);
    expect(overLimit(2, 2)).toBe(0);
    expect(overLimit(2.6, 2)).toBeCloseTo(0.5);
    expect(overLimit(9, 2)).toBe(1);
  });

  it('el llindar «segons les expectatives» fa servir el «Com parlo?» actual', () => {
    let s = appData();
    expect(noiseLimit({ limit: 'auto' }, s.live)).toBe(2);
    s = act(s, 'expectations', 'setVoice', { key: GENERAL, level: 1 });
    expect(noiseLimit({ limit: 'auto' }, s.live)).toBe(1);
    expect(noiseLimit({ limit: 3 }, s.live)).toBe(3);
  });

  it('només desa el calibratge, mai el nivell', () => {
    const s = act(appData(), 'noise', 'calibrate', { quietDb: -61.2 });
    expect(s.live.modules.noise).toEqual({ quietDb: -61.2 });
    expect(sanitizeReading({ active: true, level: 99 })).toEqual({ active: true, level: 5 });
    expect(sanitizeReading('x')).toBeNull();
  });
});

describe('torns', () => {
  it('ordre de la llista circular: ara i després', () => {
    let s = act(appData(), 'turns', 'setKind', { kind: 'names' });
    s = act(s, 'turns', 'setNames', { names: ['Anna', '', ' Pau ', 'Marta'] });
    let t = s.live.modules.turns;
    expect(t.names).toEqual(['Anna', 'Pau', 'Marta']);
    expect(nowAndNext(t)).toEqual({ now: 0, next: 1 });
    s = act(act(act(s, 'turns', 'next'), 'turns', 'next'), 'turns', 'next');
    t = s.live.modules.turns;
    expect(t.position).toBe(0);
    s = act(s, 'turns', 'prev');
    expect(nowAndNext(s.live.modules.turns)).toEqual({ now: 2, next: 0 });
  });

  it('l’ordre aleatori ve del panell, es valida i comença pel primer', () => {
    let s = act(appData(), 'turns', 'setCount', { count: 5 });
    s = act(s, 'turns', 'next');
    s = act(s, 'turns', 'shuffle', { order: [4, 2, 0, 1, 3] });
    expect(s.live.modules.turns).toMatchObject({
      order: [4, 2, 0, 1, 3],
      position: 0,
      mode: 'random',
    });
    const same = act(s, 'turns', 'shuffle', { order: [0, 0, 1, 2, 3] });
    expect(same).toBe(s);
    expect(isPermutation(randomOrder(12), 12)).toBe(true);
    s = act(s, 'turns', 'listOrder');
    expect(s.live.modules.turns.order).toEqual([0, 1, 2, 3, 4]);
  });

  it('en afegir participants es conserva l’ordre dels que hi eren', () => {
    let s = act(appData(), 'turns', 'setCount', { count: 3 });
    s = act(s, 'turns', 'shuffle', { order: [2, 0, 1] });
    s = act(s, 'turns', 'setCount', { count: 4 });
    expect(s.live.modules.turns.order).toEqual([2, 0, 1, 3]);
    expect(sanitizeTurns({ kind: 'colors', count: 30 }).order).toHaveLength(8);
  });

  it('els noms no s’exporten si no es marca explícitament', () => {
    let s = act(appData(), 'turns', 'setKind', { kind: 'names' });
    s = act(s, 'turns', 'setNames', { names: ['Anna', 'Pau'] });
    s = act(s, 'core', 'saveTemplate', { id: 'classe', name: 'Classe' });
    const tpl = s.templates.find((x) => x.id === 'classe');
    expect(tpl?.content.turns).toMatchObject({ kind: 'names', names: ['Anna', 'Pau'] });
    expect(hasPrivateData(s.templates, registry)).toBe(true);
    const clean = withoutPrivateData(s.templates, registry);
    expect(clean.find((x) => x.id === 'classe')?.content.turns).toMatchObject({ names: [] });
    expect(JSON.stringify(clean)).not.toContain('Anna');
    expect(turnsModule.exportContent?.({ names: ['x'], kind: 'names' })).toMatchObject({
      names: [],
    });
  });
});
