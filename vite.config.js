import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { precacheManifest } from './scripts/vite-plugin-precache.js';
import { contentSecurityPolicy } from './scripts/vite-plugin-csp.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const page = (/** @type {string} */ file) => fileURLToPath(new URL(file, import.meta.url));

/** Commit de la compilació (a GitHub Actions, GITHUB_SHA; en local, git). */
function buildId() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  // Rutes relatives: la mateixa build funciona a GitHub Pages (/teapp/) i en local.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(buildId()),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
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
