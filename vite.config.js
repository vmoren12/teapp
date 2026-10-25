import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { precacheManifest } from './scripts/vite-plugin-precache.js';
import { contentSecurityPolicy } from './scripts/vite-plugin-csp.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const page = (/** @type {string} */ file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  // Rutes relatives: la mateixa build funciona a GitHub Pages (/teapp/) i en local.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        main: page('./index.html'),
        projection: page('./projection.html'),
      },
    },
  },
  plugins: [contentSecurityPolicy(), precacheManifest()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.js'],
  },
});
