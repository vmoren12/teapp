# Registre de canvis

El format segueix [Keep a Changelog](https://keepachangelog.com/ca/1.1.0/) i el projecte fa servir [versions semàntiques](https://semver.org/lang/ca/).

## [0.9.0] - 2026-10-29

### Afegit

- **Rellotge digital:** l'hora (09:05) es pot mostrar a la cantonada dreta de la franja superior o de la inferior, també a pantalla completa. Es tria a «A la pantalla» → «Mida de les franges de la pantalla» → «Rellotge», i es desa amb la sessió i les plantilles; a la configuració es pot triar per a les sessions noves. Per defecte no surt. Creix amb l'alçada de la franja i no es veu si la franja està amagada o hi ha la pantalla de calma.

### Canviat

- **Actualitzacions més ràpides:** en arribar una versió nova, l'app només baixa els fitxers que han canviat (abans ho tornava a baixar tot, pictogrames i fonts inclosos) i comprova si n'hi ha cada 10 minuts en lloc de cada 30.

## [0.8.0] - 2026-10-27

### Afegit

- **Alternar vistes:** l'escenari pot passar sol d'una vista a la següent (agenda, temporitzador, Primer → Després…), tantes com es vulguin. Cada vista té el seu temps, en segons o minuts (per defecte 30 segons). Es configura a «A la pantalla» → «Alterna les vistes» i es desa amb la sessió i les plantilles. S'atura amb la pantalla de calma o si es tria a mà una vista que no és a la llista. Mentre les vistes s'alternen, les opcions de les eines del panell no s'obren soles a cada canvi.
- **Mode classe i projecció:** al desplegable de vistes hi ha un botó ràpid «Alterna les vistes» i, a cada vista, un botó per incloure-la o treure-la de l'alternança i un selector de temps (15 s, 30 s, 45 s, 1, 2, 5 o 10 min). La finestra de projecció també té ara aquests controls discrets (i «anterior / següent»): apareixen en moure el ratolí i s'amaguen quan està quiet.

## [0.7.0] - 2026-10-27

### Canviat

- **Primer → Després:** per defecte segueix l'agenda: «Primer» és l'activitat actual i «Després», la següent. Quan s'avança d'activitat, el tauler canvia sol (a la projecció i al panell). «Avança» fa passar l'agenda a l'activitat següent. Si s'edita una casella, s'intercanvien o es buiden, el tauler deixa de seguir l'agenda; el botó «Segueix l'agenda» (abans «Omple amb l'agenda») la torna a seguir. Els taulers omplerts a mà de sessions i plantilles anteriors es conserven tal com eren.

## [0.6.0] - 2026-10-27

### Afegit

- **A la pantalla:** la franja inferior (avisos) també es pot amagar, com la superior: a «Mida de les franges de la pantalla», mida «Amagada». Llavors l'escenari ocupa tot l'espai i els avisos de transició no es veuen.

### Canviat

- **Avisos de transició:** un cop apareix l'avís a la franja inferior, compta els minuts que queden d'un en un («Queden 5 minuts», 4, 3, 2, 1). El so continua sonant només als llindars triats.

### Corregit

- **Agenda (panell):** l'etiqueta «Ara», «Fet» o «Canvi» ja no fa pujar el camp del nom: ara és una etiqueta petita damunt de la vora del camp i totes les files queden alineades.

## [0.5.2] - 2026-10-26

### Corregit

- **Actualitzacions:** si l'app s'havia obert amb una recàrrega forçada (Ctrl+Maj+R), la versió nova següent no es detectava i la pàgina no es recarregava sola. Ara sí, també a la finestra de projecció.

## [0.5.1] - 2026-10-26

### Corregit

- **Agenda:** quan una activitat passa a ser l'actual, el text de la targeta ja no es desplaça. La vora destacada de l'«Ara» ja no ocupa espai i, a la vista «Ara i després», totes les targetes fan la mateixa alçada: l'actual és més ampla i amb el pictograma més gran, però l'etiqueta i el nom queden a la mateixa altura que a les altres.

### Canviat

- **Panell:** les seccions que s'obren i es tanquen («Escriu l'agenda i et suggerim els pictogrames», «Opcions de visualització», «Mida de les franges de la pantalla»…) ara semblen botons: tenen vora, canvien de fons en passar-hi per sobre i porten una fletxa que gira quan s'obren.

## [0.5.0] - 2026-10-26

### Canviat

- **Nom:** l'aplicació passa a dir-se **pictapp**. Les dades desades, les plantilles i les exportacions anteriors continuen funcionant.
- **Logotip:** nou logotip de línia minimalista: una «p» que és alhora una targeta de pictograma amb una cara senzilla. També a les icones de l'app.
- **Peu del panell:** autoria (© Víctor Moreno de la Torre, psicòleg i orientador educatiu), llicència del codi i versió amb la compilació.

## [0.4.1] - 2026-10-25

### Afegit

- **Agenda:** opció «Barra de temps a» per triar si la barra de temps surt sota totes les activitats o només sota l'activitat en curs.

## [0.4.0] - 2026-10-25

### Afegit

- **Agenda:** opció «Temps sota els pictogrames» (a «Opcions de visualització»). Sota cada pictograma hi ha una barra amb el temps de l'activitat, i si es vol també els minuts: l'actual s'esgota, les fetes queden buides i les que vénen, plenes. A l'actual hi surt també el temporitzador si en porta un de propi començat. Per defecte no es mostra.
- **Agenda:** «Escriu l'agenda» crea totes les activitats de cop a partir d'un text («Entrada 5 min, explicació 15 min i després pati»), amb un pictograma suggerit per a cadascuna i la durada si s'escriu. Es poden afegir al final o substituir les actuals. Com a les històries, la cerca a ARASAAC és opcional.

### Canviat

- **Panell:** ja no hi ha la llista de pestanyes de totes les eines sempre visible. Les opcions d'una eina s'obren soles quan es mostra a la pantalla (clicant-la o amb la seva tecla) i es tanquen amb l'agenda. Per preparar-ne una sense mostrar-la hi ha el selector discret «Opcions de».

## [0.3.0] - 2026-10-25

### Afegit

- **Mode classe:** desplegable discret per triar què es mostra (agenda, temporitzador…, pantalla de calma) i botons «anterior» i «següent», que fan el mateix que les fletxes. S'amaguen quan el cursor està quiet.
- **Històries socials:** «Escriu la història» converteix un text en una seqüència de vinyetes (una per frase), amb el tipus de frase i un pictograma suggerits al dispositiu. Opcionalment, cerca a ARASAAC els pictogrames que falten (només una paraula clau per vinyeta, i només si es marca).
- **Històries socials:** vista seqüencial amb totes les vinyetes en cadena i control des de la pantalla (fletxes i vinyetes que es poden tocar a la pissarra).
- **Franges:** tres passos més grans per a la franja superior i la inferior («Molt gran», «Enorme», «Màxima»).

### Canviat

- **Agenda:** el desplaçament és fluid (sense «scroll-snap», amb moviment suau i inèrcia en arrossegar).
- **Atribució d'ARASAAC:** ja no surt a la projecció (distreia l'alumnat); és al peu del panell del docent i a l'Ajuda.
- **Actualitzacions forçades:** quan hi ha una versió nova, el panell desa la sessió i es recarrega sol en un moment segur (fora del mode classe, sense diàlegs i sense escriure). La projecció també, quan no és a pantalla completa.

## [0.2.1] - 2026-10-25

### Afegit

- **Peu del panell** amb la versió i el codi de la compilació, per veure si l'app oberta és la darrera publicada.

### Corregit

- **Actualitzacions:** en obrir o recarregar l'app es carrega sempre la darrera versió publicada (quan hi ha connexió). El service worker ja no queda retingut per la memòria cau HTTP de GitHub Pages i es comprova si hi ha versió nova en tornar a la pestanya i cada 30 minuts.
- **Service worker:** sovint no s'arribava a registrar (s'esperava l'esdeveniment «load», que ja havia passat quan acabava l'arrencada). Ara es registra sempre, s'activa tan bon punt té desada la versió nova (el panell avisa per recarregar) i troba els fitxers sense connexió encara que el servidor enviï capçaleres «Vary».

## [0.2.0] - 2026-10-25

### Afegit (Fase 2)

- **Instruccions pas a pas:** un pas gran o la llista, amb els fets marcats. Passos generals o propis de cada activitat, que es carreguen sols quan l'activitat comença. Les fletxes passen els passos quan són a l'escenari.
- **Expectatives de l'activitat:** on treballo, com parlo (escala de veu 0–4), què necessito i quan acabo (amb el temps del temporitzador). Valors predefinits: individual, parelles, grup i exposició.
- **Sonòmetre de grup:** volum de tota l'aula amb l'escala de veu, calibratge i sensibilitat. Només es calcula el volum al navegador; indicador «Micròfon actiu» i apagada automàtica.
- **Torns previsibles:** noms, números o colors; ordre de la llista o aleatori anunciat; opció d'amagar els noms.

### Afegit (Fase 3)

- **Històries socials:** vinyetes amb tipus de frase (pautes de Carol Gray) i tres històries d'exemple.
- **Regulació:** termòmetre emocional (3–5 nivells amb estratègies) i respiració guiada (4-6, 4-4-4, 5-5, 4-7-8), sense so per defecte i amb alternativa estàtica per a «moviment reduït». Es pot llançar des de la pantalla de calma.
- **Tauler d'elecció:** de 2 a 6 opcions, amb l'opció del grup marcada o només com a referència.

### Canviat (ajustos de la Fase 1)

- **Agenda:** una sola fila desplaçable amb el dit, el ratolí i el teclat, amb indicadors discrets i retorn a l'activitat actual. Reordenar arrossegant al panell.
- **Temporitzador:** es pot lligar a l'activitat actual de l'agenda i en segueix tots els canvis.
- **Projecció:** alçada configurable de les franges superior i inferior.
- **Exportacions:** les dades personals (noms dels torns) només s'exporten amb una casella explícita.
- **Dades:** versió 3 del model (migracions 1→2 i 2→3).

## [0.1.0] - 2026-10-25

### Afegit (Fase 1)

- **Panell de control i finestra de projecció** sincronitzats amb BroadcastChannel, amb vista prèvia exacta al panell i mode classe per a una sola pantalla.
- **Agenda visual:** estats fet / ara / després, targetes de canvi, edició en directe, vista «tot el dia» o «ara i després».
- **Temporitzador visual:** disc o barra, minuts / minuts i segons / cap número, so suau opcional.
- **Primer → Després:** edició en directe, marcar com a fet, avançar i omplir amb l'agenda.
- **Avisos de transició** a 10, 5, 3, 2 i 1 minut (configurables) vinculats a l'agenda.
- **Pantalla de calma** (tecla `B` / `.`).
- **Plantilles d'exemple:** «Dilluns 1r ESO», «Sessió PFI» i «Tutoria». Exportació i importació en JSON.
- **Pictogrames d'ARASAAC:** cerca en català, 52 pictogrames inclosos per a ús offline i imatges pròpies.
- **Perfils visuals** estàndard, alt contrast i mínim. Mida de text de la projecció i del panell configurable.
- **Interfície** en català, castellà i anglès.
- **PWA instal·lable** que funciona sense connexió.
- **Dreceres de teclat** compatibles amb comandaments de presentació.
