// Accessibilitat: revisió automàtica amb axe (WCAG 2.2 A/AA) i navegació per teclat.
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** @param {import('@playwright/test').Page} page */
async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

test('el panell de control no té errors d’accessibilitat', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  await expectNoViolations(page);
});

test('els diàlegs no tenen errors d’accessibilitat', async ({ page }) => {
  await page.goto('./');
  for (const name of ['Plantilles', 'Configuració', 'Ajuda']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');
  }
});

test('els perfils d’alt contrast i mínim no tenen errors d’accessibilitat', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Configuració', exact: true }).click();
  for (const profile of ['Alt contrast', 'Mínim']) {
    await page.getByRole('radio', { name: new RegExp(profile) }).check();
    await page.keyboard.press('Escape');
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Configuració', exact: true }).click();
  }
});

test('la projecció no té errors d’accessibilitat', async ({ context }) => {
  const control = await context.newPage();
  await control.goto('./');
  const projection = await context.newPage();
  await projection.goto('./projection.html');
  await expect(projection.locator('.pj-card').first()).toBeVisible();
  await expectNoViolations(projection);
});

test('es pot fer servir només amb el teclat', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);

  // El primer Tab porta a l'enllaç per saltar al contingut.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Salta al contingut' })).toBeFocused();

  // Obrir l'ajuda amb «?» i tancar-la amb Esc: el focus torna on era.
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Ajuda' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Pantalla de calma');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Les opcions d'una eina s'obren soles quan es mostra (aquí, amb la tecla 2).
  await expect(page.locator('.tool-panel:not([hidden])')).toHaveCount(0);
  await page.keyboard.press('2');
  await expect(page.getByRole('region', { name: 'Temporitzador' })).toBeVisible();
  // Amb l'agenda (que té la seva columna) no se n'obre cap.
  await page.keyboard.press('1');
  await expect(page.locator('.tool-panel:not([hidden])')).toHaveCount(0);

  // Les fletxes no avancen l'agenda mentre s'escriu en un camp.
  await page.getByLabel("Nom de l'activitat 1").focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.agenda-row').first()).toHaveAttribute('data-status', 'now');

  // Mode classe amb «C» i sortida amb Esc.
  await page.locator('body').click({ position: { x: 2, y: 400 } });
  await page.keyboard.press('c');
  await expect(page.locator('.class-mode')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.class-mode .pj-card[data-status="now"]')).toContainText('Explicació');
  await page.keyboard.press('Escape');
  await expect(page.locator('.class-mode')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Mode classe/ })).toBeFocused();
});
