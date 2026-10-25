# Com contribuir

Gràcies per voler millorar pictapp. Aquestes són les normes bàsiques del projecte.

## Principis

1. **Llegible abans que enginyós.** Fem servir JavaScript sense frameworks ni dependències en temps d'execució. Els comentaris, en català, van a les parts que no són evidents.
2. **Privadesa per disseny.** No hi pot haver cap dada de l'alumnat fora del dispositiu, ni connexions noves sense parlar-ne abans (cal actualitzar la CSP a `scripts/vite-plugin-csp.js`).
3. **Accessibilitat i baixa càrrega sensorial.** El nivell mínim és WCAG 2.2 AA. Res de moviments sobtats ni colors saturats, i cada element sempre al mateix lloc.
4. **Cap text en dur al codi.** Tots els textos van a `i18n/*.json`, en tots els idiomes.

## Flux de treball

```bash
npm ci
npm run dev
npm run check        # lint + format + tipus + tests unitaris
npm run test:e2e     # abans d'obrir una PR
```

- Crea una branca a partir de `main` (`feat/…`, `fix/…`, `docs/…`).
- Fes servir missatges de commit amb el format [Conventional Commits](https://www.conventionalcommits.org/ca/) (`feat: …`, `fix: …`).
- La integració contínua ha de passar abans de fusionar res. Cada fusió a `main` es publica a GitHub Pages.

## Afegir un mòdul

Segueix la secció [«Com afegir un mòdul nou» del README](README.md#com-afegir-un-mòdul-nou). Un mòdul no pot modificar el nucli. Si et cal alguna cosa nova del nucli, obre primer una incidència.

## Canvis al model de dades

Si canvies l'estructura del que es desa:

1. Puja `SCHEMA_VERSION` a `core/schema/migrations.js`.
2. Afegeix la migració des de la versió anterior.
3. Afegeix-ne un test a `tests/unit/schema.test.js`.
