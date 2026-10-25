// Descarrega el paquet inicial de pictogrames d'ARASAAC perquè l'app
// funcioni offline des del primer dia.
//
// Ús: node scripts/fetch-starter-pictos.mjs
//
// Pictogrames: Sergio Palao. Origen: ARASAAC (https://arasaac.org).
// Llicència: CC BY-NC-SA 4.0. Propietat: Govern d'Aragó.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, 'public', 'starter-pictos');
const MANIFEST = path.join(ROOT, 'pictograms', 'starter.json');
const API = 'https://api.arasaac.org/v1/pictograms/ca';
const STATIC = 'https://static.arasaac.org/pictograms';

// clau estable (fa de clau i18n) → terme de cerca en català.
// Si cal fixar un pictograma concret, s'hi pot posar el número d'ARASAAC.
/** @type {Record<string, string | number>} */
const TERMS = {
  entrar: 'entrar',
  assemblea: 'assemblea',
  matematiques: 'matemàtiques',
  catala: 8069, // bandera de Catalunya (no hi ha pictograma «català»)
  castella: 8108, // bandera d'Espanya
  angles: 'anglès',
  ciencies: 35437, // pissarra de ciències de la naturalesa
  socials: 'ciències socials',
  musica: 'música',
  educacioFisica: 'educació física',
  plastica: 'dibuixar',
  tecnologia: 'tecnologia',
  ordinador: 'ordinador',
  biblioteca: 'biblioteca',
  tutoria: 'tutoria',
  examen: 'examen',
  llegir: 'llegir',
  escriure: 'escriure',
  treballGrup: 31278, // treball cooperatiu
  treballar: 'treballar',
  escoltar: 'escoltar',
  parlar: 'parlar',
  silenci: 'silenci',
  pensar: 'pensar',
  preguntar: 'preguntar',
  esperar: 'esperar',
  pati: 'pati',
  esmorzar: 'esmorzar',
  dinar: 'dinar',
  lavabo: 'lavabo',
  beure: 2276,
  descansar: 'descansar',
  recollir: 'recollir',
  acabar: 'acabar',
  comencar: 'començar',
  excursio: 'excursió',
  casa: 'casa',
  canvi: 31955, // «canviar» (no el canvi de diners)
  relaxar: 32826, // racó de la calma
  respirar: 'respirar',
  jugar: 'jugar',
  deures: 'deures',
  exposicio: 'exposició',
  video: 34319, // veure una pel·lícula
  taller: 'taller',
  practiques: 'empresa',
  autobus: 'autobús',
  rellotge: 'rellotge',
  agenda: 'agenda',
  professor: 'professor',
  companys: 'companys',
  llibre: 'llibre',
};

/** @param {string} url */
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

/** @param {string} term */
async function findId(term) {
  const enc = encodeURIComponent(term);
  const best = await getJson(`${API}/bestsearch/${enc}`);
  if (Array.isArray(best) && best.length) return best[0]._id;
  const any = await getJson(`${API}/search/${enc}`);
  if (Array.isArray(any) && any.length) return any[0]._id;
  return null;
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir(path.dirname(MANIFEST), { recursive: true });
/** @type {{ key: string, id: number }[]} */
const items = [];
for (const [key, term] of Object.entries(TERMS)) {
  const id = typeof term === 'number' ? term : await findId(term);
  if (!id) {
    console.warn(`✗ ${key}: sense resultats per a «${term}»`);
    continue;
  }
  const img = await fetch(`${STATIC}/${id}/${id}_300.png`);
  if (!img.ok) {
    console.warn(`✗ ${key}: no s'ha pogut baixar ${id}`);
    continue;
  }
  await writeFile(path.join(OUT_DIR, `${id}.png`), Buffer.from(await img.arrayBuffer()));
  items.push({ key, id });
  console.log(`✓ ${key} → ${id}`);
}

const manifest = {
  attribution: 'Sergio Palao. ARASAAC (https://arasaac.org). CC BY-NC-SA 4.0. Govern d’Aragó.',
  items,
};
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${items.length} pictogrames desats.`);
