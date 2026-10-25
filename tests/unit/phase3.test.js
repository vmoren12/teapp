// @ts-check
// Mòduls de la Fase 3: històries socials, regulació i tauler d'elecció.
import { describe, expect, it } from 'vitest';
import { reduce } from '../../core/actions.js';
import {
  currentIndex,
  currentStory,
  sanitizeState as sanitizeStory,
  sentenceBalance,
} from '../../modules/story/logic.js';
import { breathingPhase, sanitizeLevels } from '../../modules/regulation/logic.js';
import regulationModule from '../../modules/regulation/index.js';
import { isReady } from '../../modules/choice/logic.js';
import { appData, registry } from './helpers.js';

/** @param {any} state @param {string} module @param {string} type @param {any} [payload] @param {number} [now] */
const act = (state, module, type, payload, now = 1000) =>
  reduce(state, { module, type, payload }, { now, registry });

/** @param {number} n */
const panels = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    label: `Frase ${i}`,
    picto: null,
    kind: 'descriptive',
  }));

describe('històries socials', () => {
  it('afegeix una història, la mostra i en passa les vinyetes', () => {
    let s = act(appData(), 'story', 'addStory', {
      story: { id: 's1', title: 'Substitut', panels: panels(3) },
    });
    let st = s.live.modules.story;
    expect(currentStory(st)?.title).toBe('Substitut');
    s = act(act(act(s, 'story', 'next'), 'story', 'next'), 'story', 'next');
    st = s.live.modules.story;
    expect(currentIndex(st)).toBe(2);
    s = act(s, 'story', 'prev');
    expect(currentIndex(s.live.modules.story)).toBe(1);
  });

  it('edita vinyetes i canvia d’història', () => {
    let s = act(appData(), 'story', 'addStory', {
      story: { id: 's1', title: 'A', panels: panels(2) },
    });
    s = act(s, 'story', 'addStory', { story: { id: 's2', title: 'B', panels: [] } });
    expect(s.live.modules.story.currentId).toBe('s2');
    s = act(s, 'story', 'addPanel', {
      storyId: 's2',
      panel: { id: 'x', label: 'Hola', kind: 'directive' },
    });
    s = act(s, 'story', 'updatePanel', { storyId: 's2', id: 'x', patch: { kind: 'perspective' } });
    expect(currentStory(s.live.modules.story)?.panels[0]).toMatchObject({
      label: 'Hola',
      kind: 'perspective',
    });
    s = act(s, 'story', 'select', { id: 's1' });
    s = act(s, 'story', 'removeStory', { id: 's1' });
    expect(s.live.modules.story.currentId).toBe('s2');
  });

  it('recorda la proporció de Carol Gray (més descriptives que directives)', () => {
    /** @param {string[]} kinds */
    const of = (kinds) =>
      /** @type {any[]} */ (kinds.map((kind, i) => ({ id: `${i}`, label: '', picto: null, kind })));
    expect(sentenceBalance(of(['descriptive', 'perspective', 'directive'])).balanced).toBe(true);
    expect(sentenceBalance(of(['descriptive', 'directive', 'directive'])).balanced).toBe(false);
  });

  it('les històries es desen a la plantilla i viatgen amb ella', () => {
    let s = act(appData(), 'story', 'addStory', {
      story: { id: 's1', title: 'A', panels: panels(1) },
    });
    s = act(s, 'core', 'saveTemplate', { id: 't2', name: 'Amb història' });
    expect(/** @type {any} */ (s.templates[1].content.story).stories[0].title).toBe('A');
    expect(
      sanitizeStory({ stories: [{ id: 'z', panels: [{ id: 'q', kind: 'mal' }] }] }).stories[0]
        .panels[0].kind,
    ).toBe('descriptive');
  });
});

describe('regulació', () => {
  it('el termòmetre té de 3 a 5 nivells', () => {
    const level = (/** @type {number} */ i) => ({ id: `l${i}`, label: `N${i}`, color: 'green' });
    expect(sanitizeLevels([level(1), level(2)])).toEqual([]);
    expect(sanitizeLevels([1, 2, 3, 4, 5, 6].map(level))).toHaveLength(5);
    let s = act(appData(), 'regulation', 'setLevels', { levels: [1, 2, 3].map(level) });
    expect(s.live.modules.regulation.levels).toHaveLength(3);
    // No es pot baixar de 3.
    expect(act(s, 'regulation', 'removeLevel', { id: 'l1' })).toBe(s);
    s = act(s, 'regulation', 'updateLevel', { id: 'l2', patch: { color: 'rose' } });
    expect(s.live.modules.regulation.levels[1]).toMatchObject({ label: 'N2', color: 'rose' });
    s = act(s, 'regulation', 'addStrategy', {
      levelId: 'l2',
      item: { id: 'e1', label: 'Beure aigua' },
    });
    expect(s.live.modules.regulation.levels[1].strategies[0].label).toBe('Beure aigua');
  });

  it('no hi ha cap acció per registrar l’estat de ningú', () => {
    const actions = Object.keys(/** @type {any} */ (registry.get('regulation')).actions);
    expect(actions.some((a) => /record|mark|set(State|Student)/i.test(a))).toBe(false);
  });

  it('calcula la fase de la respiració a partir de l’inici', () => {
    expect(breathingPhase('4-6', 0)).toMatchObject({ phase: 'in', second: 1 });
    expect(breathingPhase('4-6', 3500)).toMatchObject({ phase: 'in', second: 4 });
    expect(breathingPhase('4-6', 4000)).toMatchObject({ phase: 'out', second: 1 });
    expect(breathingPhase('4-6', 10_000)).toMatchObject({ phase: 'in', cycle: 1 });
    expect(breathingPhase('4-4-4', 5000)).toMatchObject({ phase: 'hold', second: 2 });
  });

  it('es llança des de la pantalla de calma i no fa so si no s’activa', () => {
    expect(regulationModule.calmLaunch?.action).toBe('startBreathing');
    let s = act(appData(), 'core', 'toggleCalm');
    s = act(s, 'regulation', 'startBreathing', null, 5000);
    s = act(s, 'core', 'setStage', { id: 'regulation' });
    expect(s.live.calm).toBe(false);
    expect(s.live.modules.regulation).toMatchObject({ tool: 'breathing', breathingSince: 5000 });

    const sounds = /** @type {string[]} */ ([]);
    const ctx = /** @type {any} */ ({
      ui: { playSound: (/** @type {string} */ k) => sounds.push(k) },
    });
    const shared = { settings: s.settings, live: s.live };
    const memo = {};
    for (const now of [5000, 9500, 15_000]) regulationModule.onTick?.(ctx, shared, now, memo);
    expect(sounds).toEqual([]);
    const withSound = {
      ...shared,
      live: {
        ...s.live,
        config: { ...s.live.config, regulation: { pattern: '4-6', sound: true } },
      },
    };
    for (const now of [5000, 9500, 15_000]) regulationModule.onTick?.(ctx, withSound, now, memo);
    expect(sounds).toEqual(['soft', 'soft']);
  });
});

describe('tauler d’elecció', () => {
  const options = [1, 2, 3].map((i) => ({ id: `o${i}`, label: `Opció ${i}`, picto: null }));

  it('mostra de 2 a 6 opcions i marca la del grup', () => {
    let s = act(appData(), 'choice', 'setOptions', { title: 'Què fem?', options });
    let c = s.live.modules.choice;
    expect(isReady(c)).toBe(true);
    expect(c.chosenId).toBeNull();
    s = act(s, 'choice', 'choose', { id: 'o2' });
    expect(s.live.modules.choice.chosenId).toBe('o2');
    // Tornar-la a prémer la desmarca (el tauler queda com a referència).
    s = act(s, 'choice', 'choose', { id: 'o2' });
    expect(s.live.modules.choice.chosenId).toBeNull();
    s = act(s, 'choice', 'choose', { id: 'o1' });
    s = act(s, 'choice', 'remove', { id: 'o1' });
    c = s.live.modules.choice;
    expect(c.chosenId).toBeNull();
    expect(isReady(act(s, 'choice', 'remove', { id: 'o2' }).live.modules.choice)).toBe(false);
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, label: '' }));
    expect(
      act(s, 'choice', 'setOptions', { options: many }).live.modules.choice.options,
    ).toHaveLength(6);
  });

  it('la tria del grup no es desa a la plantilla', () => {
    let s = act(appData(), 'choice', 'setOptions', { options });
    s = act(s, 'choice', 'choose', { id: 'o1' });
    s = act(s, 'core', 'saveTemplate', { id: 'tc', name: 'Amb tauler' });
    const content = /** @type {any} */ (s.templates[1].content.choice);
    expect(content.options).toHaveLength(3);
    expect(content.chosenId).toBeUndefined();
  });
});
