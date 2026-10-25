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
  // L'atribució d'ARASAAC no surt a la projecció, sinó al peu del panell.
  await expect(projection.getByText(/ARASAAC/)).toHaveCount(0);
  await expect(control.getByRole('contentinfo')).toContainText('ARASAAC');

  await control.getByText('Mida de les franges de la pantalla').click();
  await control.getByRole('button', { name: 'Restableix' }).click();
  await expect(root).toHaveAttribute('data-header', 'medium');
  await expect(root).toHaveAttribute('data-footer', 'medium');
});

test('el temporitzador lligat segueix els canvis de durada de la franja', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  await page.getByLabel('Opcions de').selectOption({ label: 'Temporitzador' });
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
  await control.getByLabel('Opcions de').selectOption({ label: 'Instruccions' });
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
  await page.getByLabel('Opcions de').selectOption({ label: 'Torns' });
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
    await control.getByLabel('Opcions de').selectOption({ label: tab });
    if (fill) await control.getByRole('button', { name: fill }).click();
    await projection.keyboard.press(key);
    await expect(projection.locator('.pj-slot:not([hidden])')).toHaveCount(1);
    await expectNoViolations(control);
    await expectNoViolations(projection);
  }
});

test('mode classe: desplegable de vistes i botó «següent» discrets', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  await page.getByRole('button', { name: /Comença/ }).click();
  await page.getByRole('button', { name: /Mode classe/ }).click();
  const overlay = page.locator('.class-mode');
  await expect(overlay).toBeVisible();

  await overlay.getByRole('button', { name: 'Següent' }).click();
  await expect(overlay.locator('.pj-card[data-status="now"]')).toContainText('Explicació');
  // El focus torna a la pantalla: les fletxes (comandament) continuen funcionant.
  await page.keyboard.press('ArrowRight');
  await expect(overlay.locator('.pj-card[data-status="now"]')).toContainText('Treball individual');

  await overlay.getByRole('button', { name: /Tria què es mostra/ }).click();
  await overlay.getByRole('button', { name: 'Temporitzador' }).click();
  await expect(overlay.locator('.pj-slot--timer')).toBeVisible();
  // Esc tanca el desplegable sense sortir del mode classe.
  await overlay.getByRole('button', { name: /Tria què es mostra/ }).click();
  await page.keyboard.press('Escape');
  await expect(overlay).toBeVisible();
  await expectNoViolations(page);
});

test('històries: el text es converteix en vinyetes i la seqüència es controla des de la pantalla', async ({
  context,
}) => {
  const { control, projection } = await openBoth(context);
  await control.getByLabel('Opcions de').selectOption({ label: 'Històries socials' });
  await control.getByText('Escriu la història i et suggerim les vinyetes').click();
  await control
    .getByLabel('Text de la història')
    .fill('Avui ve una professora substituta. Potser ens sembla estrany. Podem preguntar dubtes.');
  await control.getByRole('button', { name: 'Suggereix les vinyetes' }).click();
  await expect(control.getByText(/amb 3 vinyetes/).first()).toBeVisible();
  await expect(control.getByLabel('Frase de la vinyeta 2')).toHaveValue(
    'Potser ens sembla estrany.',
  );

  await control.locator('.tool-panel:not([hidden]) .pane__config summary').click();
  await control.getByRole('radio', { name: 'Seqüència sencera' }).check({ force: true });
  await projection.keyboard.press('8');
  const steps = projection.locator('.pj-story__step');
  await expect(steps).toHaveCount(3);
  await expect(projection.locator('.pj-story__item').first().locator('tea-picto')).toHaveCount(1);
  // Tocar la tercera vinyeta a la pissarra la fa actual.
  await steps.nth(2).click();
  await expect(projection.locator('.pj-story__item[data-status="now"]')).toContainText(
    'Podem preguntar dubtes.',
  );
  await expect(control.locator('.callout').filter({ hasText: 'Vinyeta 3 de 3' })).toBeVisible();
  await expectNoViolations(projection);
});

test('les opcions d’una eina s’obren soles en mostrar-la, i només aquesta', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  const open = page.locator('.tool-panel:not([hidden])');
  // Amb l'agenda a la pantalla no hi ha cap llista d'eines oberta.
  await expect(open).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);

  await page.locator('.stage-option', { hasText: 'Primer → Després' }).click();
  await expect(open).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Primer → Després' })).toBeVisible();

  // Preparar una altra eina sense mostrar-la.
  await page.getByLabel('Opcions de').selectOption({ label: 'Avisos de transició' });
  await expect(page.getByRole('region', { name: 'Avisos de transició' })).toBeVisible();
  await expect(open).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Primer → Després' })).toBeChecked();

  await page.getByRole('button', { name: 'Tanca les opcions' }).click();
  await expect(open).toHaveCount(0);
  // Tornar a clicar el que ja es mostra en torna a obrir les opcions.
  await page.locator('.stage-option', { hasText: 'Primer → Després' }).click();
  await expect(page.getByRole('region', { name: 'Primer → Després' })).toBeVisible();
  await expectNoViolations(page);
});

test('agenda: el text es converteix en activitats amb pictograma i durada', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.agenda-row')).toHaveCount(5);
  await page.getByText("Escriu l'agenda i et suggerim els pictogrames").click();
  await page
    .getByLabel("Activitats de l'agenda")
    .fill('Entrada 5 min, explicació del professor 15 min i després pati');
  await page.getByLabel('Substitueix les activitats actuals').check();
  await page.getByRole('button', { name: 'Crea les activitats' }).click();
  const dialog = page.getByRole('dialog', { name: 'Substituir les activitats?' });
  await dialog.getByRole('button', { name: 'Substitueix' }).click();

  await expect(page.locator('.agenda-row')).toHaveCount(3);
  await expect(page.getByLabel("Nom de l'activitat 2")).toHaveValue('Explicació del professor');
  await expect(page.getByLabel('Durada en minuts de «Explicació del professor»')).toHaveValue('15');
  await expect(page.getByLabel('Durada en minuts de «Pati»')).toHaveValue('10');
  // Pictogrames inclosos suggerits, sense connexió.
  await expect(page.locator('.agenda-row').nth(1).locator('tea-picto')).toHaveCount(1);
  await expect(page.locator('.agenda-row').nth(2).locator('tea-picto')).toHaveCount(1);
  await expect(page.getByText("S'han afegit 3 activitats a l'agenda.").first()).toBeVisible();
  await expectNoViolations(page);
});

test('agenda: barra de temps sota els pictogrames, amb el temporitzador propi', async ({
  context,
}) => {
  const { control, projection } = await openBoth(context);
  await expect(projection.locator('.pj-time')).toHaveCount(0);
  await control.locator('.pane--agenda .pane__config summary').click();
  await control.getByRole('radio', { name: 'Barra i minuts' }).check({ force: true });
  await control.getByRole('button', { name: /Comença/ }).click();

  const now = projection.locator('.pj-card[data-status="now"]');
  await expect(now.locator('.pj-time')).toHaveCount(1);
  await expect(now.locator('.pj-time__text')).toHaveText('Queden 5 min');
  await expect(projection.locator('.pj-card[data-status="next"] .pj-time__text')).toHaveText(
    '15 min',
  );

  // Un temporitzador amb temps propi en marxa surt a sota de l'activitat actual.
  await control.getByLabel('Opcions de').selectOption({ label: 'Temporitzador' });
  await control.getByRole('button', { name: '3 min' }).click();
  await control.getByRole('button', { name: /^Inicia/ }).click();
  await expect(now.locator('.pj-time[data-kind="timer"]')).toHaveCount(1);
  await expect(now.locator('.pj-time[data-kind="timer"] .pj-time__text')).toHaveText(
    'Queden 3 min',
  );
  await expectNoViolations(projection);
});
