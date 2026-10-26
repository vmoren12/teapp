# pictapp · Estructura visual de l'aula

**Aplicació web per al docent, projectada a la pissarra digital, que estructura la sessió de manera visual i previsible.** Està pensada especialment per a l'alumnat amb TEA, però s'aplica a tot el grup seguint el Disseny Universal per a l'Aprenentatge (DUA): mai no singularitza cap alumne davant la classe.

👉 **Fes-la servir ara:** <https://vmoren12.github.io/teapp/>. És instal·lable com a app i funciona sense connexió.

- Sense comptes ni registre. Totes les dades es queden al navegador del docent.
- Funciona offline (PWA).
- Cap dada de l'alumnat a la projecció ni a cap servidor.
- En català, i també en castellà i anglès.

---

## Índex

1. [Què fa](#què-fa)
2. [Com es fa servir a l'aula](#com-es-fa-servir-a-laula)
3. [Dreceres de teclat](#dreceres-de-teclat)
4. [Privadesa](#privadesa)
5. [Instal·lació i desenvolupament](#installació-i-desenvolupament)
6. [Arquitectura](#arquitectura)
7. [Com afegir un mòdul nou](#com-afegir-un-mòdul-nou)
8. [Decisions pedagògiques](#decisions-pedagògiques)
9. [Qualitat i accessibilitat](#qualitat-i-accessibilitat)
10. [Full de ruta](#full-de-ruta)
11. [Crèdits i llicències](#crèdits-i-llicències)

---

## Què fa

| Mòdul                    | Què fa                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agenda visual**        | Seqüència d'activitats amb pictograma i text i estats _fet / ara / després_. Es pot escriure seguida i se'n suggereixen els pictogrames. La **targeta de canvi** serveix per anunciar imprevistos. |
| **Temporitzador visual** | Disc o barra que s'esgota amb colors suaus. Mostra els minuts (opcionalment els segons, o res) i fa un so suau opcional en acabar.                                                                 |
| **Primer → Després**     | Tauler de dues caselles. Per defecte segueix l'agenda (activitat actual i següent) i canvia sol en avançar; també s'edita a mà en directe. Es pot marcar «fet» i fer-lo avançar.                   |
| **Avisos de transició**  | Avís a la franja inferior a 5, 2 i 1 minut (configurable) abans d'acabar l'activitat de l'agenda, amb l'activitat que ve després.                                                                  |
| **Instruccions**         | Passos curts amb pictograma: un pas gran («Pas 2 de 5») o la llista amb l'actual destacat. Cada activitat de l'agenda pot tenir les seves, i es carreguen soles.                                   |
| **Expectatives**         | Tauler fix de quatre preguntes: on treballo, com parlo (escala de veu 0–4), què necessito i quan acabo (amb el temps del temporitzador, si es vol). Valors predefinits.                            |
| **Sonòmetre de grup**    | Nivell de soroll de tota l'aula amb l'escala de veu. Només es calcula el volum al navegador: no es grava ni es desa res. Canvi de color gradual, sense alarmes.                                    |
| **Torns**                | Qui té el torn ara i després, en un ordre fix i visible. Noms, números o colors. L'ordre aleatori s'anuncia sencer abans de començar.                                                              |
| **Històries socials**    | Vinyetes per anticipar canvis. El docent pot escriure el text sencer i se'n suggereixen les vinyetes. Una vinyeta gran o la seqüència sencera, controlable des de la pissarra.                     |
| **Regulació**            | Termòmetre emocional de 3 a 5 nivells amb estratègies (referència de grup) i respiració guiada amb ritme configurable, també des de la pantalla de calma.                                          |
| **Tauler d'elecció**     | De 2 a 6 opcions amb pictograma. Es pot marcar l'opció del grup o deixar-lo com a referència.                                                                                                      |

També inclou:

- **Pantalla de calma.** Congela la projecció en una vista neutra amb un sol botó o la tecla `B`. Des d'aquí es pot llançar la respiració guiada.
- **Agenda desplaçable.** A la pissarra, la fila d'activitats es desplaça de manera fluida amb el dit, el ratolí (arrossegant o amb la roda) o el teclat i torna sola a l'activitat actual al cap de 15 s. Al panell, les activitats es reordenen arrossegant-les (o amb «Mou amunt/avall»).
- **Temps sota els pictogrames.** Opcional: una barra que s'esgota sota cada activitat de l'agenda o només sota l'actual (i els minuts, si es vol), amb el temporitzador a sota de l'actual si en porta un de propi.
- **Temporitzador lligat a l'agenda.** «Lliga'l a l'activitat actual» fa que segueixi el temps de la franja (durada, «+5 min», reiniciar) i l'activitat següent. Qualsevol acció manual el deslliga.
- **Opcions a mà, sense soroll.** Les opcions d'una eina s'obren soles quan es mostra a la pantalla. Per preparar-ne una sense mostrar-la, hi ha el selector «Opcions de».
- **Mida de les franges.** L'alçada de la franja superior i de la inferior es canvia amb controls lliscants o amb tiradors a la vista prèvia. Es desa a la sessió i a les plantilles.
- **Plantilles** reutilitzables: «Dilluns 1r ESO», «Sessió PFI» i «Tutoria» venen d'exemple. Es poden exportar i importar en JSON.
- **Pictogrames d'ARASAAC:** 52 de bàsics inclosos (funcionen offline) i cerca en català. També es poden pujar imatges pròpies.
- **Perfils visuals:** estàndard, alt contrast i mínim, amb mida de text configurable a la projecció i al panell.

## Com es fa servir a l'aula

**Amb dues pantalles** (portàtil + pissarra):

1. Obre pictapp al portàtil. És el **panell de control**.
2. Prem **Obre la projecció** (`P`), arrossega la finestra a la pissarra i fes-hi doble clic (o prem `F`) per posar-la a pantalla completa.
3. Carrega una plantilla o escriu l'agenda. Prem **Comença** i avança amb `→` o amb el comandament de presentació.
4. Pots editar-ho tot en directe: la projecció s'actualitza al moment. El panell mostra una vista prèvia exacta del que es veu a la pissarra.

**Amb una sola pantalla:** prem **Mode classe** (`C`). La projecció ocupa tota la pantalla i les dreceres continuen funcionant. A les cantonades hi ha un desplegable discret per triar què es mostra i els botons «anterior» i «següent». Amb `Esc` tornes al panell per editar.

> Consell: no minimitzis la finestra del panell. Els navegadors alenteixen les pestanyes amagades i els avisos sonors podrien arribar tard.

## Dreceres de teclat

Funcionen al panell, al mode classe i a la finestra de projecció. Són compatibles amb els comandaments de presentació, que envien fletxes, AvPàg/RePàg i `B` o `.` per a la «pantalla negra».

| Tecla         | Acció                                                |
| ------------- | ---------------------------------------------------- |
| `→` / `AvPàg` | Activitat següent                                    |
| `←` / `RePàg` | Activitat anterior                                   |
| `Espai`       | Inicia o pausa el temporitzador                      |
| `1` … `9` `0` | Mostra un mòdul a l'escenari (en l'ordre del panell) |
| `B` / `.`     | Pantalla de calma                                    |
| `F`           | Pantalla completa                                    |
| `C`           | Mode classe (només al panell)                        |
| `P`           | Obre la finestra de projecció (només al panell)      |
| `?`           | Ajuda (només al panell)                              |
| `Esc`         | Surt del mode classe                                 |

Quan les **instruccions**, els **torns** o una **història social** són a l'escenari, `→` / `←` (i AvPàg/RePàg) passen el pas, el torn o la vinyeta en lloc de l'activitat.

Les dreceres no s'activen mentre escrius en un camp de text.

## Privadesa

- **Tot és local.** Les dades es desen a IndexedDB, o a localStorage si IndexedDB no està disponible. No hi ha servidor, comptes, analítica ni galetes.
- **ARASAAC.** L'única connexió externa és la cerca de pictogrames. Només s'hi envia la paraula cercada, sense galetes ni capçalera _Referer_. Els pictogrames triats es desen al dispositiu. El suggeriment de pictogrames a partir d'un text (històries i agenda) es fa al dispositiu; només si el docent ho marca, s'envia a ARASAAC una paraula clau per vinyeta o activitat.
- **Ordinadors compartits.** A _Configuració › Privadesa_ pots desactivar «Conserva la sessió en directe»: la sessió s'esborra en tancar el navegador. També hi ha un botó per esborrar totes les dades.
- **Content Security Policy.** Impedeix carregar codi o connectar amb qualsevol altre lloc.
- **Exportacions.** Les plantilles exportades no contenen cap dada de l'alumnat. Els noms dels torns només s'hi inclouen si el docent marca explícitament la casella (que sempre comença desmarcada).
- **Sonòmetre.** El micròfon només s'activa amb un botó, hi ha un indicador permanent «Micròfon actiu» i s'apaga quan el sonòmetre deixa de ser a l'escenari. L'àudio es processa al navegador (`AnalyserNode`) i només se'n calcula el volum: no es grava, no es desa, no s'envia i no hi ha historial. El nivell arriba a la projecció com a valor efímer, sense passar per l'estat ni pel desat.
- **Torns, regulació i tauler d'elecció.** Els noms dels torns només es desen en local i es poden amagar a la projecció. Cap d'aquests mòduls registra res de cap alumne.

## Instal·lació i desenvolupament

Requisits: [Node.js](https://nodejs.org) 20 o superior.

```bash
git clone https://github.com/vmoren12/teapp.git
cd teapp
npm ci
npm run dev          # servidor de desenvolupament (http://localhost:5173)
```

| Ordre               | Què fa                                                  |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolupament amb recàrrega automàtica    |
| `npm run build`     | Build de producció a `dist/` (amb service worker i CSP) |
| `npm run preview`   | Serveix la build en local                               |
| `npm test`          | Tests unitaris (Vitest)                                 |
| `npm run test:e2e`  | Tests e2e i d'accessibilitat (Playwright + axe)         |
| `npm run lint`      | ESLint                                                  |
| `npm run format`    | Prettier                                                |
| `npm run typecheck` | Revisió de tipus estricta (TypeScript sobre JSDoc)      |
| `npm run check`     | Lint + format + tipus + tests unitaris                  |
| `npm run pictos`    | Torna a descarregar el paquet inicial de pictogrames    |
| `npm run icons`     | Regenera les icones PNG de la PWA                       |

La primera vegada que facis servir els tests e2e cal instal·lar el navegador: `npx playwright install chromium`.

**Publicació.** Cada `push` a `main` passa per la integració contínua (lint, tipus, tests unitaris i e2e) i, si tot va bé, es publica automàticament a GitHub Pages (`.github/workflows/ci.yml`).

## Arquitectura

HTML, CSS i JavaScript sense frameworks, amb mòduls ES natius. **No hi ha cap dependència en temps d'execució:** Vite només serveix per desenvolupar i empaquetar. Els tipus es comproven amb JSDoc i `// @ts-check` en mode estricte (`tsc --noEmit`), sense compilar TypeScript.

### Carpetes

```
index.html              Panell de control
projection.html         Finestra de projecció
core/                   Nucli: store, accions, registre, sincronització, teclat, model de dades
  boot-control.js       Arrencada del panell (connecta totes les peces)
  boot-projection.js    Arrencada de la projecció (rèplica de només lectura)
  schema/               Validació, migracions i dades d'exemple
  sync/                 Sincronització entre finestres (transport intercanviable)
modules/                Una carpeta per eina, totes amb el mateix contracte
  agenda/  timer/  first-then/  transitions/
  steps/  expectations/  noise/  turns/  story/  regulation/  choice/
  shared/               Lògica comuna (elements amb pictograma, contingut per activitat, escala de veu)
  index.js              Llista de mòduls actius
components/             Interfície reutilitzable (diàlegs, pestanyes, <tea-picto>…)
storage/                StorageAdapter: IndexedDB, localStorage i memòria
pictograms/             Client d'ARASAAC, biblioteca local i paquet inicial
i18n/                   ca.json, es.json, en.json i la funció t()
styles/                 Tokens, perfils i capes CSS
public/                 Service worker, manifest, icones i pictogrames inicials
tests/unit  tests/e2e   Vitest i Playwright
```

### Flux de dades

```
  teclat / clic / comandament / (futur: mòbil)
                 │  acció JSON {module, type, payload}
                 ▼
   dispatch ──► reductor pur del mòdul ──► store (estat immutable)
                                              │
            ┌─────────────────────────────────┼──────────────────────────┐
            ▼                                 ▼                          ▼
   vistes del panell              persistència (StorageAdapter)   sincronització
   (+ vista prèvia)               IndexedDB / localStorage        BroadcastChannel
                                                                         │
                                                                         ▼
                                                            finestra de projecció
                                                            (rèplica de només lectura)
```

- **Store** (`core/store.js`): `getState`, `setState` i `subscribe`. L'estat és immutable, així que les vistes comparen referències i només redibuixen el que ha canviat.
- **Accions** (`core/actions.js`): totes són objectes JSON serialitzables i els reductors són purs, sense DOM ni `Date.now()`. Això les fa fàcils de provar i permet que arribin d'una altra finestra o, en el futur, d'un mòbil.
- **Temps:** es calcula sempre a partir de marques horàries (`startedAt`, `runningSince`) i mai comptant segons. Les dues finestres mostren el mateix i res es desquadra si una es recarrega.
- **Sincronització** (`core/sync/`):
  - El panell és l'única font de veritat i envia l'estat complet (pocs kB) a cada canvi.
  - La projecció en conserva les parts que no han canviat (`core/share.js`) i només reenvia tecles.
  - La interfície `SyncTransport` permet canviar BroadcastChannel per WebRTC o WebSocket per al control des del mòbil sense tocar res més.
  - Des de fora només s'accepten les accions associades a dreceres (`isRemoteAllowed`).

### Model de dades

```js
AppData = {
  schemaVersion: 3,
  settings: { locale, profile, textScale, uiScale, motion, sound, keepSession, layout },
  templates: [{ id, name, config: { layout, [mòdul]: {...} }, content: { [mòdul]: {...} }, createdAt, updatedAt }],
  live: { templateId, name, stage, calm, config: { layout, [mòdul]: {...} }, modules: { [mòdul]: estat } },
}
```

- **Plantilla i sessió en directe.** «Carrega» copia la plantilla a `live`. El que fas a classe no modifica la plantilla fins que la deses.
- **Validació pròpia** (`core/schema/validate.js` i el `sanitize*` de cada mòdul). Tot el que es llegeix (desat o importat) passa per aquí. Les dades il·legibles es descarten sense perdre les vàlides.
- **Migracions** (`core/schema/migrations.js`). Si canvia l'estructura, puja `SCHEMA_VERSION` i afegeix una funció de migració i el seu test. Les dades d'una versió més nova mai no se sobreescriuen: se'n fa una còpia de seguretat.

### Estils

Capes `@layer reset, tokens, base, components, layout, modules, profiles, motion`:

- **Colors i mides.** Tots són variables CSS (`styles/tokens.css`). Els perfils (`styles/profiles.css`) només redefineixen variables.
- **Escala de la projecció.** Fa servir unitats de contenidor (`cqmin`), de manera que es veu igual a la pissarra, a la vista prèvia i a qualsevol resolució. `--text-scale` ho amplia tot.
- **Escriptura de dreta a esquerra.** Es fan servir propietats lògiques (`margin-inline`…) per poder afegir àrab o urdú.

### Internacionalització

Els textos són a `i18n/<idioma>.json` i al codi només s'hi fa servir `t('clau', { paràmetres })`, amb suport de plurals (`one` / `other`). Per afegir un idioma:

1. Copia `ca.json`.
2. Tradueix-lo.
3. Afegeix-lo a `LOCALES` i `loaders` a `i18n/index.js` i a `LOCALE_CODES` a `core/schema/validate.js`.

Un test comprova que tots els idiomes tenen les mateixes claus.

## Com afegir un mòdul nou

Cada eina és una carpeta autocontinguda. El nucli no la coneix: només en llegeix el contracte (`TeappModule` a `core/types.js`).

1. Crea `modules/el-meu-modul/index.js`:

```js
// @ts-check
import './el-meu-modul.css'; // estils dins de @layer modules { … }

/** @type {import('../../core/types.js').TeappModule} */
export default {
  id: 'elMeuModul', // camelCase, únic
  version: 1,
  nameKey: 'elMeuModul.name', // clau i18n
  icon: 'info', // nom a components/icons.js
  region: 'stage', // 'stage' (escenari) o 'footer' (franja inferior)
  configSchema: [
    // genera el formulari i valida la configuració
    { key: 'gran', type: 'boolean', labelKey: 'elMeuModul.config.gran' },
  ],
  defaults: () => ({ gran: false }),
  initialState: (config, content) => ({ comptador: 0 }),
  actions: {
    // reductors purs: (estat, payload, { now, live, settings }) => estat nou
    suma: (s) => ({ ...s, comptador: s.comptador + 1 }),
  },
  // opcional; amb when: 'stage' la drecera només val quan el mòdul és a l'escenari
  keys: [{ keys: ['+'], action: 'suma', descKey: 'elMeuModul.keys.suma' }],
  renderControl(el, ctx) {
    // controls al panell (ctx.dispatch, ctx.t, ctx.ui…)
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = ctx.t('elMeuModul.suma');
    btn.onclick = () => ctx.dispatch({ type: 'suma' });
    el.append(btn);
    return { update() {}, destroy: () => el.replaceChildren() };
  },
  renderProjection(el, ctx) {
    // vista neta per a la projecció
    const p = document.createElement('p');
    el.append(p);
    return {
      update(state) {
        p.textContent = String(state.live.modules.elMeuModul.comptador);
      },
      destroy: () => el.replaceChildren(),
    };
  },
  // Opcionals: toTemplate, sanitizeContent, sanitizeState, onTick,
  // exportContent (treu dades personals en exportar), calmLaunch (botó a la pantalla de calma)
};
```

2. Afegeix-lo a `modules/index.js`.
3. Afegeix-ne els textos a `i18n/*.json`.
4. Escriu-ne els tests a `tests/unit/`.

Ja està: tindrà les seves opcions al panell, tecla numèrica si és d'escenari, configuració desada a les plantilles, sincronització i persistència. Si les dades antigues no tenen estat per al mòdul nou, se'n crea l'inicial automàticament.

## Decisions pedagògiques

- **Una idea per pantalla.** L'escenari mostra un sol mòdul alhora. _Ara → Després_ és sempre a dalt i els avisos sempre a baix. L'alumnat TEA es guia per patrons espacials: si les coses canvien de lloc, augmenta la càrrega cognitiva.
- **Avisos graduals, mai sobtats.** Els avisos de transició apareixen i sonen per graons (5 → 2 → 1), com ho faria el docent de viva veu. Un cop a la pantalla, compten els minuts que queden d'un en un («Queden 5», 4, 3…), sense segons. Es mostren a la franja inferior, sense finestres emergents ni parpellejos.
- **La targeta de canvi** es distingeix per la forma (vora discontínua), una icona i el text «Canvi», no només pel color. Anticipar els imprevistos redueix l'ansietat per incertesa.
- **Minuts i no segons.** Per defecte, el temporitzador mostra minuts. Veure córrer els segons pot generar pressió. En acabar no hi ha parpelleig: el disc queda buit i apareix un missatge.
- **Sense hores ni durades a la projecció.** L'alumnat necessita saber _què_ ve després, no un horari que pot generar angoixa si es desquadra.
- **Fet es veu, però apagat.** Les activitats fetes es mantenen (el progrés dona seguretat), amb menys pes visual. El perfil mínim les amaga.
- **So opcional i suau.** Els tons són sinusoïdals, d'atac lent i a volum baix. Mai no és una alarma.
- **Mai singularitzar.** No hi ha noms d'alumnes ni res individualitzat a la projecció: tot s'adreça al grup (DUA).
- **Baixa càrrega sensorial.** La paleta és suau, les transicions són curtes (≤ 0,3 s) i desactivables i es respecta `prefers-reduced-motion`. La tipografia és Atkinson Hyperlegible, dissenyada per a la llegibilitat.

## Qualitat i accessibilitat

- **WCAG 2.2 AA:**
  - navegació completa per teclat;
  - diàlegs natius (`<dialog>`) amb focus atrapat i retorn del focus;
  - pestanyes amb el patró ARIA;
  - zones clicables de 44 px;
  - contrast AA a tots els perfils;
  - avisos de confirmació anunciats amb `aria-live`.
- **Tests unitaris** (Vitest): store, compartició estructural, validació, migracions, reductors de tots els mòduls, temporitzador lligat, franges, dreceres d'escenari, avisos, sincronització (també els valors efímers), persistència, exportació/importació sense dades personals i i18n.
- **Tests e2e** (Playwright):
  - preparar i conduir una sessió;
  - sincronització entre el panell i la projecció;
  - ús només amb el teclat;
  - revisió automàtica amb axe del panell, dels diàlegs, de tots els perfils i de la projecció;
  - agenda desplaçable, franges, temporitzador lligat, dreceres d'escenari, exportació sense noms i axe de tots els mòduls nous.
- **Rendiment:** uns 35 kB de JavaScript comprimit, sense dependències, i cap animació costosa. Pensat per a ordinadors d'aula modestos.

## Full de ruta

- **Fet:** Fase 1 (amb els ajustos d'agenda, temporitzador i franges), Fase 2 (instruccions, expectatives, sonòmetre, torns) i Fase 3 (històries socials, regulació, tauler d'elecció).
- **Pendent de validar:** millores de la pantalla de calma (missatge configurable, fons més o menys fosc).
- **Futur:**
  - control des del mòbil (`SyncTransport` amb WebRTC);
  - col·locació automàtica a la segona pantalla (Window Management API);
  - suport RTL complet (àrab, urdú);
  - proves amb Firefox i Safari.

## Crèdits i llicències

- **Codi:** [EUPL-1.2](LICENSE) (European Union Public Licence).
- **Pictogrames:** l'autor és Sergio Palao i l'origen [ARASAAC](https://arasaac.org); la llicència és [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ca) i la propietat, del Govern d'Aragó. Els de `public/starter-pictos/` es distribueixen amb aquesta llicència (vegeu-ne el [LICENSE](public/starter-pictos/LICENSE.md)). L'atribució es mostra al peu del panell del docent i a l'Ajuda (no a la projecció, per no distreure l'alumnat).
- **Tipografia:** Atkinson Hyperlegible, del Braille Institute, amb llicència [SIL Open Font License 1.1](styles/fonts/OFL.txt).
