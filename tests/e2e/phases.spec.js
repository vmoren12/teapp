// Ajustos de la Fase 1 i mòduls de les fases 2 i 3.
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** @param {import('@playwright/test').Page} page */
async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

/** @param {import('@playwright/test').BrowserContext} context */
async function openBoth(context) {
  const control = await context.newPage();
  await control.goto('./');
  await expect(control.locator('.agenda-row')).toHaveCount(5);
  const projection = await context.newPage();
  await projection.setViewportSize({ width: 1280, height: 720 });
  await projection.goto('./projection.html');
  await expect(projection.locator('.pj-card').first()).toBeVisible();
  return { control, projection };
}

test('l’agenda es desplaça sense canviar l’activitat actual', async ({ context }) => {
  const { control, projection } = await openBoth(context);
  for (let i = 0; i < 8; i++) {
    await control.getByRole('button', { name: 'Afegeix una activitat' }).click();
    await control.keyboard.type(`Extra ${i + 1}`);
  }
  const strip = projection.locator('.pj-agenda__strip');
  await expect(strip).toHaveAttribute('data-more-end', 'true');
  await expect(strip).toHaveAttribute('data-more-start', 'false');

  const scroller = projection.locator('.pj-agenda__scroller');
  await scroller.hover();
  await projection.mouse.wheel(0, 2000);
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(strip).toHaveAttribute('data-more-start', 'true');
  // L'activitat actual no ha canviat, ni a la projecció ni al panell.
  await expect(projection.locator('.pj-card[data-status="now"]')).toContainText(
    'Entrada i salutació',
  );
  await expect(control.locator('.agenda-row').first()).toHaveAttribute('data-status', 'now');

  // Amb el teclat (zona enfocada), les fletxes desplacen en lloc d'avançar.
  await scroller.focus();
  await projection.keyboard.press('Home');
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBe(0);
  await projection.keyboard.press('ArrowRight');
  await expect(projection.locator('.pj-card[data-status="now"]')).toContainText(
    'Entrada i salutació',
  );
});

test('l’alçada de les franges es canvia amb els controls i amb els tiradors', async ({
  context,
}) => {
  const { control, projection } = await openBoth(context);
  const root = projection.locator('.projection');
  await expect(root).toHaveAttribute('data-header', 'medium');

  const handle = control.getByRole('slider', { name: 'Alçada de la franja superior' });
  await handle.focus();
  await control.keyboard.press('ArrowUp');
  await expect(root).toHaveAttribute('data-header', 'small');
  await expect(handle).toHaveAttribute('aria-valuetext', 'Petita');
  await control.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-header', 'hidden');

  // La franja inferior no es pot amagar (atribució i avisos).
  const footer = control.getByRole('slider', { name: 'Alçada de la franja inferior' });
  await footer.focus();
  await control.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-footer', 'small');
  await expect(projection.locator('.pj-attribution')).toBeVisible();

  await control.getByText('Mida de les franges de la pantalla').click();
  await control.getByRole('button', { name: 'Restableix' }).click();
  await expect(root).toHaveAttribute('data-header', 'medium');
  await expect(root).toHaveAttribute('data-footer', 'medium');
});

test('el temporitzador lligat segueix els canvis de durada de la franja', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  await page.getByRole('button', { name: "Lliga'l a l'activitat actual" }).click();
  await expect(page.locator('.timer-link')).toContainText('Lligat a: Entrada i salutació');
  await expect(page.locator('.timer-readout__clock')).toHaveText('05:00');
  await page.getByLabel('Durada en minuts de «Entrada i salutació»').fill('12');
  await page.getByLabel('Durada en minuts de «Entrada i salutació»').press('Tab');
  await expect(page.locator('.timer-readout__clock')).toHaveText('12:00');
  // Una acció manual el deslliga.
  await page.getByRole('button', { name: '+1 min' }).click();
  await expect(page.locator('.timer-link')).toBeHidden();
  await expect(page.locator('.timer-readout__clock')).toHaveText('13:00');
});

test('amb les instruccions a l’escenari, les fletxes passen els passos', async ({ context }) => {
  const { control, projection } = await openBoth(context);
  await control.getByRole('tab', { name: 'Instruccions' }).click();
  for (const text of ['Obre el llibre', 'Llegeix', 'Respon']) {
    await control.getByRole('button', { name: 'Afegeix un pas' }).click();
    await control.keyboard.type(text);
  }
  await projection.keyboard.press('4');
  await expect(projection.locator('.pj-steps__label')).toHaveText('Obre el llibre');
  await projection.keyboard.press('ArrowRight');
  await expect(projection.locator('.pj-steps__label')).toHaveText('Llegeix');
  await expect(projection.locator('.pj-steps__count')).toHaveText('Pas 2 de 3');
  // L'agenda no s'ha mogut.
  await expect(control.locator('.agenda-row').first()).toHaveAttribute('data-status', 'now');
  // Amb l'agenda a l'escenari, les fletxes tornen a ser de l'agenda.
  await projection.keyboard.press('1');
  await projection.keyboard.press('ArrowRight');
  await expect(control.locator('.agenda-row').first()).toHaveAttribute('data-status', 'done');
});

test('els noms dels torns no s’exporten si no es marca la casella', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: 'Torns' }).click();
  await page.getByRole('radio', { name: 'Noms o grups' }).check({ force: true });
  await page.getByLabel('Noms, àlies o grups (un per línia)').fill('Anna\nPau');
  await page.getByRole('button', { name: 'Plantilles' }).click();
  await page.getByRole('button', { name: 'Desa com a plantilla nova' }).click();
  await page
    .getByRole('dialog', { name: 'Desa com a plantilla nova' })
    .getByRole('button', { name: 'Desa' })
    .click();
  const box = page.getByLabel("Inclou els noms dels torns (dades de l'alumnat)");
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporta-les totes' }).click();
  const file = await (await download).path();
  const text = readFileSync(file, 'utf8');
  expect(text).not.toContain('Anna');
});

test('la respiració guiada es llança des de la pantalla de calma', async ({ page }) => {
  await page.goto('./');
  const launch = page.getByRole('button', { name: 'Respiració guiada', exact: true });
  await expect(launch).toBeHidden();
  await page.getByRole('button', { name: /Pantalla de calma/ }).click();
  await launch.click();
  await expect(page.getByRole('button', { name: /Pantalla de calma/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('.preview .pj-slot--regulation')).toBeVisible();
  await expect(page.locator('.preview .pj-breath__phase')).toHaveText(/Inspira|Expira/);
});

test('els mòduls nous no tenen errors d’accessibilitat (panell i projecció)', async ({
  context,
}) => {
  const { control, projection } = await openBoth(context);
  const modules = [
    ['Instruccions', '4', 'Afegeix un pas'],
    ['Expectatives', '5', 'En parelles'],
    ['Sonòmetre', '6', null],
    ['Torns', '7', null],
    ['Històries socials', '8', 'Afegeix-la'],
    ['Regulació', '9', "Termòmetre d'exemple (5 nivells)"],
    ["Tauler d'elecció", '0', 'Fes-les servir'],
  ];
  for (const [tab, key, fill] of modules) {
    await control.getByRole('tab', { name: tab }).click();
    if (fill) await control.getByRole('button', { name: fill }).click();
    await projection.keyboard.press(key);
    await expect(projection.locator('.pj-slot:not([hidden])')).toHaveCount(1);
    await expectNoViolations(control);
    await expectNoViolations(projection);
  }
});
