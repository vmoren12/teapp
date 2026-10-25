# Instruccions de desenvolupament

Aquest document recull la feina pendent de TEApp: els ajustos demanats sobre la Fase 1 i les fases que queden. És el punt de partida de cada iteració.

## Com treballem

1. Abans d'implementar cada bloc, es presenta el disseny (model de dades, contracte del mòdul i interfície) i s'espera la validació.
2. Cal preguntar abans de qualsevol decisió que afecti l'escalabilitat o la privacitat.
3. En acabar cada bloc s'escriu un resum: què s'ha fet, quines decisions s'han pres i com provar-ho.
4. Les decisions pedagògiques es justifiquen breument.
5. Criteris que s'apliquen sempre:
   - **Privacitat:** cap dada personal d'alumnes surt del dispositiu, i la projecció mai singularitza cap alumne.
   - **Textos:** tots van a `i18n/ca.json`, `es.json` i `en.json`, amb les mateixes claus.
   - **Accessibilitat:** WCAG 2.2 AA. Cada acció d'arrossegar té una alternativa amb un sol clic o amb el teclat (criteri 2.5.7).
   - **Qualitat:** `npm run check` i `npm run test:e2e` han de passar, i cada canvi de comportament porta test.
   - **Dades:** si el model canvia, s'incrementa `SCHEMA_VERSION` i s'afegeix una migració a `core/schema/migrations.js`.

---

## 1. Ajustos sobre la Fase 1

S'han d'abordar abans de començar la Fase 2.

### 1.1 Agenda del dia desplaçable amb la mà

**Ara:** a la projecció, l'agenda reparteix les targetes en files i talla les que no hi caben (`overflow: hidden`). Amb moltes activitats, algunes no es veuen.

**Cal:** que a la pissarra es pugui desplaçar l'agenda amb el dit (o amb el ratolí) per arribar a qualsevol activitat, sigui quina sigui l'activitat actual i en totes dues vistes (totes i focus).

**Criteris d'acceptació:**

- Es desplaça arrossegant amb el dit, amb la roda del ratolí i amb el teclat. El moviment és suau i respecta el perfil «moviment reduït».
- La vista es pot desplaçar en qualsevol posició, també cap a activitats passades i futures, sense que el desplaçament canviï l'activitat actual.
- La posició del desplaçament és un estat local de la finestra i no se sincronitza. Així la projecció i la vista prèvia del panell no es «barallen».
- Hi ha un indicador discret, sense fletxes que parpellegin, que mostra que hi ha més activitats a banda i banda.
- Mode classe: funciona igual que a la finestra de projecció.

**Proposta de disseny:**

- Les targetes van en una sola fila amb desplaçament horitzontal i `scroll-snap`, sense saltar de línia.
- La gestió de punter fa servir `touch-action: pan-x`.

**Decisió que cal validar:** després d'uns 15 s sense tocar-la, l'agenda torna a centrar-se a l'activitat actual. També s'hi centra quan l'activitat canvia.

**Justificació pedagògica:** l'alumnat ha de poder veure tota la seqüència del dia. Tornar sola a l'activitat actual manté el punt de referència estable.

**A confirmar:** si «desplaçable» vol dir també **reordenar** les activitats arrossegant-les. En aquest cas, ho faríem al panell de control, amb els botons «amunt/avall» com a alternativa.

### 1.2 El temporitzador segueix els canvis de temps de la franja

**Ara:** el botó «Agafa el temps de l'activitat» copia una sola vegada el temps que queda (`timerActions.fromActivity` a `modules/timer/logic.js`). Si després es canvia la durada de l'activitat, s'hi afegeix temps o es reinicia, el temporitzador no se n'assabenta.

**Cal:** que, si es canvia la durada de la franja actual, el temporitzador s'actualitzi al moment.

**Proposta de disseny:**

- Afegir a `TimerState` el camp `linkedActivityId: string | null`.
  - **Mentre està lligat:** el temps que queda i el total es calculen a partir de l'agenda (`agendaRemaining` i `durationMin + extraMs`) en lloc de les marques pròpies. Així qualsevol canvi a la franja (`update`, `extend`, `restartTime`) es reflecteix sense duplicar l'estat.
  - **Com es deslliga:** amb qualsevol acció manual sobre el temporitzador (`set`, `add` o un valor predefinit). En aquest cas, el temporitzador passa a temps propi, conservant el temps que quedava.
- Si l'activitat lligada s'esborra, el temporitzador es deslliga i es queda en pausa.
- El panell indica clarament «Lligat a: _nom de l'activitat_» i ofereix un botó per deslligar-lo.
- **Decisió que cal validar:** quan l'agenda passa a la següent activitat, el temporitzador lligat la segueix automàticament. Alternativa: es deslliga i s'atura.
- La migració és senzilla: `linkedActivityId: null` per a les dades existents.

**Tests:**

- Canviar `durationMin` de l'activitat actual modifica el temps que queda.
- `extend` hi suma temps.
- `set` deslliga el temporitzador.
- Esborrar l'activitat el deslliga.
- El so final no sona dues vegades.

**Justificació pedagògica:** si la pantalla diu dues coses diferents (l'agenda i el temporitzador), es trenca la previsibilitat. Ha d'haver-hi una sola font de veritat.

### 1.3 Alçada configurable de les franges superior i inferior

**Ara:** la projecció té tres zones fixes (`grid-template-rows: auto minmax(0, 1fr) auto` a `styles/projection.css`):

- franja superior: «Ara → Després»;
- escenari: temporitzador, agenda o Primer → Després;
- franja inferior: avisos de transició i atribució.

**Cal:** que el docent pugui ajustar a mà l'alçada de la franja superior i de la inferior. L'escenari (on hi ha el temporitzador) es fa més petit o més gran en conseqüència.

**Criteris d'acceptació:**

- **Al panell de control:**
  - Dos controls lliscants a la secció «Pantalla», amb passos fixos (per exemple: amagada, petita, mitjana, gran).
  - Tiradors arrossegables a la vista prèvia, accessibles amb teclat (fletxes) i amb etiqueta.
- **Contingut:** el contingut de cada franja s'escala amb la seva alçada (unitats `cqh`/`cqmin`) i mai queda tallat. El temporitzador s'ajusta a l'espai que queda, amb una mida mínima perquè es continuï llegint bé.
- **Opció «amagada»:** només és possible a la franja superior. A la inferior, l'atribució d'ARASAAC ha de continuar visible quan hi ha pictogrames, i els avisos de transició ocupen l'espai mínim necessari.
- **Valors per defecte:** els d'ara, amb un botó «Restableix».
- **Projecció:** el canvi es veu al moment, sense animacions brusques.

**Decisió que cal validar:** on es desa l'alçada de les franges. Proposta:

- dins de la configuració de la sessió (`live.config.layout`), perquè cada plantilla en pugui portar la seva;
- amb un valor general a «Paràmetres» per a les sessions noves.

En tots dos casos el valor es valida (`sanitizeConfig`) i es migra.

**Justificació pedagògica:** cada aula i cada pissarra són diferents. Si es redueix el que sobra, l'element important guanya mida, i la pantalla manté sempre la mateixa estructura (només canvien les proporcions).

---

## 2. Fase 2

Cal presentar el disseny de cada mòdul i esperar la validació abans d'implementar-lo. Tots segueixen el contracte de `core/types.js` (`TeappModule`), viuen a `modules/<nom>/` i es registren a `modules/index.js`.

### 2.1 Instruccions pas a pas

- Seqüència de passos (pictograma + text curt) per a una tasca. A la projecció es mostra **un sol pas** gran, amb un indicador «pas 2 de 5», o bé la llista amb el pas actual destacat.
- Es pot avançar i retrocedir amb les mateixes tecles que l'agenda quan és a l'escenari. Els passos fets es marquen sense desaparèixer.
- Cada activitat de l'agenda pot tenir les seves instruccions. Quan l'activitat comença, s'hi carreguen soles.
- **Justificació pedagògica:** dividir la tasca en passos visibles redueix la càrrega de memòria de treball i les preguntes repetides.

### 2.2 Expectatives de l'activitat

Tauler fix de quatre preguntes, amb pictograma i resposta curta:

- On treballo?
- Com parlo? (Escala de veu de 0 a 4.)
- Què necessito?
- Quan acabo? (Es pot enllaçar amb el temporitzador.)

A més:

- Hi ha valors predefinits i reutilitzables (treball individual, en parelles, en grup, exposició).
- Cada activitat de l'agenda en pot tenir unes.
- **Justificació pedagògica:** fa explícites les normes implícites, sempre al mateix lloc i amb el mateix format.

### 2.3 Sonòmetre de grup

**Funcionament:** indicador visual del nivell de soroll de tota l'aula. Fa servir l'escala de veu de l'apartat 2.2, amb zones de color suaus i una agulla o barra amb moviment esmorteït.

**Privacitat (cal confirmar-la abans d'implementar):**

- L'àudio es processa al navegador amb `AnalyserNode` i només se'n calcula el volum. No es grava, no es desa i no s'envia res.
- El micròfon només s'activa amb un botó explícit, hi ha un indicador permanent de «micròfon actiu» al panell i s'apaga en sortir del mòdul.
- No hi ha historial ni cap atribució del soroll a cap alumne.

**Comportament:**

- No té sons d'alarma ni colors vermells que parpellegin. Superar el llindar només canvia el color de manera gradual.
- Té calibratge i sensibilitat configurables.

**Justificació pedagògica:** dona un feedback del grup, no individual, i substitueix els avisos verbals repetits.

### 2.4 Torns previsibles

**Funcionament:**

- Mostra qui té el torn ara i qui el té després, en un ordre fix i visible.
- Hi ha modes de rotació (ordre de llista o aleatori **anunciat abans**, mai sorpresa).

**Privacitat (decisió que cal validar):**

- Els noms o àlies es desen **només en local** i **mai s'inclouen a les exportacions** per defecte. Exportar-los requereix una casella explícita.
- Es poden fer servir números, colors o noms de grup en lloc de noms.
- Hi ha una opció «amaga els noms a la projecció» (només es veu el torn).
- La projecció no mostra mai comptadors, puntuacions ni cap comparació entre alumnes.

**Justificació pedagògica:** saber quan arriba el torn propi redueix l'ansietat d'espera i les interrupcions.

---

## 3. Fase 3

### 3.1 Històries socials

- Seqüència breu de vinyetes (pictograma o imatge pròpia + frase en primera persona o descriptiva), segons les pautes de Carol Gray: més frases descriptives que directives.
- **Ús:** es poden preparar abans (per exemple: «Avui tenim un substitut», «Simulacre d'incendi») i projectar al grup sencer.
- **Plantilles:** se n'inclouen unes quantes d'exemple, i les històries s'exporten amb les plantilles.
- **Justificació pedagògica:** anticipar situacions noves o canvis, sempre adreçat al grup i mai a un alumne concret.

### 3.2 Regulació

- **Termòmetre emocional:** escala de 3 a 5 nivells amb colors i estratègies associades (per exemple: beure aigua, respirar o demanar una pausa). A la projecció serveix de referència per a tot el grup. **No es registra mai cap estat individual.**
- **Respiració guiada:** forma que s'expandeix i es contrau, amb ritme configurable (per exemple: 4-4-4 o 4-6) i sense so per defecte. Respecta «moviment reduït» amb una alternativa estàtica (text i comptador).
- Es pot llançar des de la pantalla de calma.

### 3.3 Tauler d'elecció

- **Funcionament:**
  - Mostra de 2 a 6 opcions amb pictograma (activitats, materials o descansos).
  - El docent marca l'opció triada pel grup o deixa el tauler només com a referència.
- **Privacitat:** no es registra qui tria què.
- **Justificació pedagògica:** oferir opcions acotades afavoreix l'autonomia i redueix la resistència.

### 3.4 Pantalla de calma (ja feta a la Fase 1)

Possibles millores, a validar:

- enllaç directe a la respiració guiada;
- missatge configurable;
- fons més o menys fosc.

---

## 4. Futur (sense data)

- **Control des del mòbil:**
  - nou `SyncTransport` amb WebRTC i aparellament per codi QR, sense servidor propi;
  - només s'hi accepten les accions de la llista blanca (`isRemoteAllowed`).
- **Segona pantalla automàtica:** col·locació automàtica de la projecció a la segona pantalla amb la Window Management API.
- **Escriptura de dreta a esquerra:** suport complet per a l'àrab i l'urdú, amb `dir="rtl"` i propietats CSS lògiques.
- **Proves:** Firefox i Safari a Playwright, a més de Chromium.
