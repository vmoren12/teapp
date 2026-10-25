// @ts-check
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../storage/memory.js';
import { loadAppData, startPersistence } from '../../core/persistence.js';
import { createStore } from '../../core/store.js';
import { DATA_KEY, SESSION_LIVE_KEY } from '../../core/config.js';
import { buildTemplatesExport, ImportError, readTemplatesImport } from '../../core/io.js';
import { createPictoLibrary } from '../../pictograms/library.js';
import { appData, fakeT, registry, seqId } from './helpers.js';

const deps = (/** @type {any} */ storage) => ({
  storage,
  registry,
  t: fakeT,
  newId: seqId,
  now: 0,
});

describe('càrrega i desat', () => {
  it('crea les plantilles d’exemple el primer cop', async () => {
    const { data, notice } = await loadAppData(deps(createMemoryStorage()));
    expect(notice).toBeNull();
    expect(data.templates.map((t) => t.name)).toEqual([
      'samples.eso.name',
      'samples.pfi.name',
      'samples.tutoring.name',
    ]);
    expect(data.live.modules.agenda.activities).toHaveLength(5);
  });

  it('desa i torna a carregar', async () => {
    const storage = createMemoryStorage();
    const store = createStore(appData());
    const persistence = startPersistence({ store, storage, delayMs: 0 });
    store.setState((s) => ({ ...s, live: { ...s.live, name: 'Dimarts' } }));
    await persistence.flush();
    const { data } = await loadAppData(deps(storage));
    expect(data.live.name).toBe('Dimarts');
    persistence.stop();
  });

  it('no sobreescriu dades d’una versió futura: en fa còpia', async () => {
    const storage = createMemoryStorage();
    await storage.set(DATA_KEY, { schemaVersion: 42 });
    const { notice } = await loadAppData(deps(storage));
    expect(notice).toBe('newer');
    expect(await storage.get(`${DATA_KEY}-backup-0`)).toEqual({ schemaVersion: 42 });
  });

  it('sense «conservar la sessió», la sessió va a sessionStorage', async () => {
    const storage = createMemoryStorage();
    const data = appData();
    data.settings.keepSession = false;
    const store = createStore(data);
    const persistence = startPersistence({ store, storage, session: sessionStorage, delayMs: 0 });
    store.setState((s) => ({ ...s, live: { ...s.live, name: 'Privada' } }));
    await persistence.flush();
    const saved = /** @type {any} */ (await storage.get(DATA_KEY));
    expect(saved.live).toBeUndefined();
    expect(JSON.parse(sessionStorage.getItem(SESSION_LIVE_KEY) ?? '{}').name).toBe('Privada');
    const { data: loaded } = await loadAppData({ ...deps(storage), session: sessionStorage });
    expect(loaded.live.name).toBe('Privada');
    persistence.stop();
  });
});

describe('exportació i importació', () => {
  it('fa el viatge d’anada i tornada amb id nous', async () => {
    const library = createPictoLibrary(createMemoryStorage());
    const exported = await buildTemplatesExport(appData().templates, library, 0);
    const { templates, skipped } = await readTemplatesImport(JSON.stringify(exported), {
      registry,
      library,
      newId: () => 'nou',
    });
    expect(skipped).toBe(0);
    expect(templates[0]).toMatchObject({ id: 'nou', name: 'Prova' });
  });

  it('rebutja fitxers que no són de TEApp', async () => {
    const library = createPictoLibrary(createMemoryStorage());
    const opts = { registry, library, newId: seqId };
    await expect(readTemplatesImport('no és json', opts)).rejects.toMatchObject({ code: 'json' });
    await expect(readTemplatesImport('{"app":"altra"}', opts)).rejects.toBeInstanceOf(ImportError);
    await expect(
      readTemplatesImport(
        JSON.stringify({ app: 'teapp', kind: 'templates', schemaVersion: 1, templates: [] }),
        opts,
      ),
    ).rejects.toMatchObject({ code: 'empty' });
  });

  it('no accepta imatges que no siguin raster', async () => {
    const library = createPictoLibrary(createMemoryStorage());
    expect(await library.importDataUrl('x', 'data:image/svg+xml;base64,PHN2Zz4=', '')).toBe(false);
  });
});
