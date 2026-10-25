// Dues vistes sincronitzades: panell de control + finestra de projecció.
import { expect, test } from '@playwright/test';

test('la projecció segueix el panell i les tecles de la projecció controlen la sessió', async ({
  context,
}) => {
  const control = await context.newPage();
  await control.goto('./');
  await expect(control.locator('.agenda-row')).toHaveCount(5);

  const projection = await context.newPage();
  await projection.goto('./projection.html');
  const now = projection.locator('.pj-card[data-status="now"]');
  await expect(now).toContainText('Entrada i salutació');
  await expect(control.getByText('Projecció connectada')).toBeVisible();

  // El panell avança → la projecció canvia.
  await control.getByRole('button', { name: /Comença/ }).click();
  await control.getByRole('button', { name: /Següent/ }).click();
  await expect(now).toContainText('Explicació');
  await expect(projection.locator('.pj-header')).toContainText('Treball individual');

  // Edició en directe: el text canvia a la projecció mentre s'escriu.
  await control.getByLabel("Nom de l'activitat 2").fill('Explicació del projecte');
  await expect(now).toContainText('Explicació del projecte');

  // Un comandament de presentació a la projecció (AvPàg) avança la sessió.
  await projection.keyboard.press('PageDown');
  await expect(now).toContainText('Treball individual');
  await expect(control.locator('.agenda-status')).toContainText('Treball individual');

  // Canviar d'escenari amb les tecles numèriques.
  await projection.keyboard.press('2');
  await expect(projection.locator('.pj-slot--timer')).toBeVisible();
  await expect(projection.locator('.pj-slot--agenda')).toBeHidden();

  // Pantalla de calma (tecla «B», com el botó de pantalla negra).
  await projection.keyboard.press('b');
  await expect(projection.locator('.pj-calm')).toBeVisible();
  await expect(control.getByRole('button', { name: /Pantalla de calma/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('la projecció espera el panell si s’obre primer', async ({ context }) => {
  const projection = await context.newPage();
  await projection.goto('./projection.html');
  await expect(projection.getByText('Esperant el panell de control…')).toBeVisible();
  const control = await context.newPage();
  await control.goto('./');
  await expect(projection.locator('.pj-card').first()).toBeVisible();
});
