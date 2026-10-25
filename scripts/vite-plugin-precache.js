// Plugin de Vite: en acabar la build, escriu dins de dist/sw.js la llista de
// fitxers que el service worker ha de desar per funcionar offline, i una
// versió de memòria cau derivada del contingut (canvia a cada build diferent).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/** @param {string} dir @param {string} [base] @returns {Promise<string[]>} */
async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

/** @returns {import('vite').Plugin} */
export function precacheManifest() {
  /** @type {string} */
  let outDir = 'dist';
  return {
    name: 'teapp-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      const files = (await listFiles(outDir))
        .filter((f) => f !== 'sw.js' && !/\.(map|txt|md)$/.test(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(await readFile(path.join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const urls = ['./', ...files.map((f) => `./${f}`)];
      const source = await readFile(swPath, 'utf8');
      await writeFile(
        swPath,
        source
          .replace('self.__PRECACHE_MANIFEST__', JSON.stringify(urls))
          .replace('__CACHE_VERSION__', version),
      );
    },
  };
}
