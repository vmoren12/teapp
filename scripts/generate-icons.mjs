// Genera les icones PNG de la PWA a partir dels SVG (fa servir el navegador de Playwright).
// Ús: node scripts/generate-icons.mjs

import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ICONS = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'public',
  'icons',
);
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'maskable-512.png', 512],
  ['maskable.svg', 'apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [source, target, size] of jobs) {
  const svg = await readFile(path.join(ICONS, source), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: path.join(ICONS, target), omitBackground: true });
  console.log(`✓ ${target}`);
}
await browser.close();
