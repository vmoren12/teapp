// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifySentence,
  keyword,
  parseList,
  pickPicto,
  splitSentences,
} from '../../modules/story/suggest.js';
import ca from '../../i18n/ca.json';
import { actionForKey, buildShortcuts, isRemoteAllowed } from '../../core/keyboard.js';
import { reloadWhenSafe } from '../../core/pwa.js';
import { FOOTER_SIZES, HEADER_EM, HEADER_SIZES, sanitizeLayout } from '../../core/layout.js';
import { registry } from './helpers.js';

const s = ca.story.suggest;
const lexicon = {
  perspective: parseList(s.perspective),
  directive: parseList(s.directive),
  affirmative: parseList(s.affirmative),
};
/** @type {Record<string, string>} */
const synonyms = s.synonyms;
const candidates = Object.entries(ca.starter).map(([key, label]) => ({
  key,
  terms: [label, ...(synonyms[key]?.split(',') ?? [])],
}));

describe('suggeriment de vinyetes', () => {
  const text =
    "Avui farem un simulacre d'incendi. Sonarà una alarma forta!\nPotser ens molesta el soroll. " +
    'Podem tapar-nos les orelles; després tornarem a classe.';

  it('divideix el text en frases', () => {
    expect(splitSentences(text)).toEqual([
      "Avui farem un simulacre d'incendi.",
      'Sonarà una alarma forta!',
      'Potser ens molesta el soroll.',
      'Podem tapar-nos les orelles;',
      'després tornarem a classe.',
    ]);
    expect(splitSentences('  \n - \n')).toEqual([]);
  });

  it('proposa el tipus de frase segons les pautes de Carol Gray', () => {
    const kinds = splitSentences(text).map((x) => classifySentence(x, lexicon));
    expect(kinds).toEqual([
      'descriptive',
      'descriptive',
      'perspective',
      'directive',
      'affirmative',
    ]);
  });

  it('tria un pictograma inclòs per paraules i sinònims, sense connexió', () => {
    expect(pickPicto('Avui ve una professora substituta', candidates)).toBe('professor');
    expect(pickPicto('Sonarà una alarma forta', candidates)).toBe('escoltar');
    expect(pickPicto('Anirem amb autobús', candidates)).toBe('autobus');
    expect(pickPicto('Podem beure aigua', candidates)).toBe('beure');
    expect(pickPicto('Zxqw', candidates)).toBeNull();
  });

  it('només extreu una paraula clau per cercar a ARASAAC', () => {
    expect(keyword("Avui farem un simulacre d'incendi.", parseList(s.stopwords))).toBe('simulacre');
  });
});

describe('mode classe i control des de la pantalla', () => {
  const shortcuts = buildShortcuts(registry);

  it('«següent» fa el mateix que la fletxa segons el mòdul de l’escenari', () => {
    expect(actionForKey(shortcuts, 'ArrowRight', 'agenda')).toMatchObject({
      module: 'agenda',
      type: 'next',
    });
    expect(actionForKey(shortcuts, 'ArrowRight', 'story')).toMatchObject({
      module: 'story',
      type: 'next',
    });
    expect(actionForKey(shortcuts, 'ArrowLeft', 'steps')).toMatchObject({
      module: 'steps',
      type: 'prev',
    });
  });

  it('des de la pissarra només s’accepten les accions remotes declarades', () => {
    const goTo = { module: 'story', type: 'goTo', payload: { index: 2 } };
    expect(isRemoteAllowed(shortcuts, goTo)).toBe(false);
    expect(isRemoteAllowed(shortcuts, goTo, registry)).toBe(true);
    expect(isRemoteAllowed(shortcuts, { module: 'story', type: 'removeStory' }, registry)).toBe(
      false,
    );
  });
});

describe('franges més grans', () => {
  it('admet passos molt més alts', () => {
    expect(HEADER_SIZES.at(-1)).toBe('huge');
    expect(HEADER_EM.huge).toBeGreaterThan(4 * HEADER_EM.medium);
    expect(FOOTER_SIZES[0]).toBe('hidden');
    expect(sanitizeLayout({ header: 'huge', footer: 'xxlarge' })).toEqual({
      header: 'huge',
      footer: 'xxlarge',
      clock: 'off',
    });
  });
});

describe('actualització forçada', () => {
  afterEach(() => vi.useRealTimers());

  it('recarrega de seguida si és segur, o espera que ho sigui', () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    reloadWhenSafe(() => true, reload);
    expect(reload).toHaveBeenCalledTimes(1);

    let safe = false;
    const later = vi.fn();
    reloadWhenSafe(() => safe, later, 1000);
    vi.advanceTimersByTime(5000);
    expect(later).not.toHaveBeenCalled();
    safe = true;
    vi.advanceTimersByTime(1000);
    expect(later).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(later).toHaveBeenCalledTimes(1);
  });
});
