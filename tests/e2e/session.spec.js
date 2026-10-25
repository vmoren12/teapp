// Flux principal: preparar una sessió en pocs clics i conduir-la.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
});

test('carregar una plantilla, editar-la en directe i avançar', async ({ page }) => {
  await page.getByRole('button', { name: 'Plantilles' }).click();
  const dialog = page.getByRole('dialog', { name: 'Plantilles' });
  await dialog.getByRole('button', { name: 'Carrega «Tutoria»' }).click();
  await page
    .getByRole('dialog', { name: 'Carregar la plantilla' })
    .getByRole('button', { name: 'Carrega' })
    .click();
  await expect(page.getByLabel('Nom de la sessió')).toHaveValue('Tutoria');
  await expect(page.locator('.agenda-row')).toHaveCount(4);

  // Afegir una activitat nova i posar-li nom.
  await page.getByRole('button', { name: 'Afegeix una activitat' }).click();
  await page.keyboard.type('Lectura');
  await expect(page.getByLabel("Nom de l'activitat 5")).toHaveValue('Lectura');
  await expect(page.locator('.pane__meta')).toHaveText('5 activitats · 60 min');

  // Començar i avançar.
  await page.getByRole('button', { name: /Comença/ }).click();
  await expect(page.locator('.agenda-status')).toContainText('Ara: Assemblea');
  await page.getByRole('button', { name: /Següent/ }).click();
  await expect(page.locator('.agenda-status')).toContainText('Ara: Activitat de grup');
  await expect(page.locator('.agenda-row').first()).toHaveAttribute('data-status', 'done');
});

test('anunciar un canvi afegeix una targeta distintiva després de l’actual', async ({ page }) => {
  await page.getByRole('button', { name: 'Anuncia un canvi' }).click();
  const rows = page.locator('.agenda-row');
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(1)).toHaveAttribute('data-kind', 'change');
  await expect(page.getByLabel("Nom de l'activitat 2")).toBeFocused();
  // A la vista prèvia de la projecció també hi és.
  await expect(page.locator('.preview .pj-card[data-kind="change"]')).toHaveCount(1);
});

test('desar com a plantilla nova i recuperar-la després de recarregar', async ({ page }) => {
  await page.getByLabel('Nom de la sessió').fill('Dimecres 2n ESO');
  await page.getByRole('button', { name: 'Plantilles' }).click();
  await page.getByRole('button', { name: 'Desa com a plantilla nova' }).click();
  const prompt = page.getByRole('dialog', { name: 'Desa com a plantilla nova' });
  await expect(prompt.getByRole('textbox')).toHaveValue('Dimecres 2n ESO');
  await prompt.getByRole('button', { name: 'Desa' }).click();
  await expect(page.getByRole('heading', { name: /Dimecres 2n ESO/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.waitForTimeout(600); // desat automàtic
  await page.reload();
  await expect(page.getByLabel('Nom de la sessió')).toHaveValue('Dimecres 2n ESO');
  await page.getByRole('button', { name: 'Plantilles' }).click();
  await expect(page.getByRole('heading', { name: /Dimecres 2n ESO/ })).toBeVisible();
});

test('el temporitzador es pot iniciar i pausar', async ({ page }) => {
  // En mostrar-lo a la pantalla, se n'obren les opcions.
  await page.locator('.stage-option', { hasText: 'Temporitzador' }).click();
  await page.getByRole('button', { name: '3 min' }).click();
  await expect(page.locator('.timer-readout__clock')).toHaveText('03:00');
  await page.getByRole('button', { name: /^Inicia/ }).click();
  await expect(page.locator('.timer-readout__state')).toHaveText('En marxa');
  await page.getByRole('button', { name: /^Pausa/ }).click();
  await expect(page.locator('.timer-readout__state')).toHaveText('En pausa');
});

test('el peu mostra la versió i la compilació', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toContainText(/TEApp \d+\.\d+\.\d+ · compilació \w+/);
});
