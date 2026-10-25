// @ts-check
// Tipus compartits de TEApp. Aquest fitxer només conté definicions JSDoc.

/** @typedef {'standard' | 'high-contrast' | 'minimal'} Profile */
/** @typedef {'system' | 'reduced' | 'gentle'} MotionPref */

/**
 * Preferències del docent. Són globals (no depenen de la plantilla).
 * @typedef {Object} Settings
 * @property {string} locale          Codi d'idioma de la interfície.
 * @property {Profile} profile        Perfil visual.
 * @property {number} textScale       Mida del text a la projecció (1–2).
 * @property {number} uiScale         Mida del text al panell de control (1–1.5).
 * @property {MotionPref} motion      Transicions: segons el sistema, cap o suaus.
 * @property {{ enabled: boolean, volume: number }} sound
 * @property {boolean} keepSession    Conservar la sessió en directe quan es tanca el navegador.
 * @property {Layout} layout          Alçada de les franges per a les sessions noves.
 */

/**
 * Alçada de les franges superior i inferior de la projecció.
 * @typedef {Object} Layout
 * @property {'hidden' | 'small' | 'medium' | 'large'} header
 * @property {'small' | 'medium' | 'large'} footer
 */

/**
 * Referència a un pictograma. Mai no conté la imatge: aquesta es resol a la biblioteca.
 * @typedef {Object} PictoRef
 * @property {'arasaac' | 'local'} source
 * @property {string} id
 * @property {string} alt
 */

/**
 * Una activitat de l'agenda.
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} label
 * @property {PictoRef | null} picto
 * @property {number} durationMin
 * @property {'normal' | 'change'} kind   'change' = targeta de canvi (imprevist).
 */

/**
 * Plantilla reutilitzable. Cada mòdul hi desa la seva configuració i, si vol, contingut.
 * @typedef {Object} Template
 * @property {string} id
 * @property {string} name
 * @property {Record<string, Record<string, unknown>>} config
 * @property {Record<string, unknown>} content
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Sessió en directe: el que s'està fent ara a l'aula.
 * @typedef {Object} LiveSession
 * @property {string | null} templateId   Plantilla d'origen (si n'hi ha).
 * @property {string} name
 * @property {string} stage               Id del mòdul que ocupa l'escenari de la projecció.
 * @property {boolean} calm               Pantalla de calma activa.
 * @property {Record<string, Record<string, unknown>>} config  Configuració de cada mòdul i, a
 *   `config.layout`, l'alçada de les franges (vegeu core/layout.js).
 * @property {Record<string, any>} modules  Estat en directe de cada mòdul (el defineix cada mòdul).
 */

/**
 * Tot el que es desa en local.
 * @typedef {Object} AppData
 * @property {number} schemaVersion
 * @property {Settings} settings
 * @property {Template[]} templates
 * @property {LiveSession} live
 */

/**
 * El que es comparteix amb la finestra de projecció (mai plantilles ni dades privades).
 * @typedef {Pick<AppData, 'settings' | 'live'>} SharedState
 */

/**
 * Acció serialitzable. Pot venir del teclat, de la projecció o, en el futur, del mòbil.
 * @typedef {Object} Action
 * @property {string} module   'core' o l'id d'un mòdul.
 * @property {string} type
 * @property {any} [payload]
 */

/** @typedef {(key: string, params?: Record<string, string | number>) => string} Translate */

/**
 * Camp de configuració d'un mòdul. Serveix per generar el formulari i per validar.
 * @typedef {Object} ConfigField
 * @property {string} key
 * @property {'boolean' | 'select' | 'number' | 'numbers'} type   'numbers' = diverses opcions numèriques.
 * @property {string} labelKey
 * @property {string} [hintKey]
 * @property {{ value: string | number, labelKey: string }[]} [options]
 * @property {number} [min]
 * @property {number} [max]
 */

/**
 * Dades que rep un reductor a més de l'estat del seu mòdul. Els reductors són purs:
 * el temps arriba aquí, no es llegeix amb Date.now().
 * @typedef {Object} ReducerEnv
 * @property {number} now
 * @property {LiveSession} live
 * @property {Settings} settings
 */

/** @typedef {(state: any, payload: any, env: ReducerEnv) => any} Reducer */

/**
 * Drecera de teclat. `action` és un tipus d'acció del mateix mòdul.
 * Amb `when: 'stage'`, la drecera només val mentre el mòdul ocupa l'escenari i
 * llavors té prioritat sobre les generals (p. ex. les fletxes passen els passos
 * de les instruccions en lloc de les activitats de l'agenda).
 * @typedef {Object} KeyBinding
 * @property {string[]} keys      Valors de KeyboardEvent.key.
 * @property {string} action
 * @property {any} [payload]
 * @property {string} descKey
 * @property {'stage'} [when]
 */

/**
 * Funcions d'interfície que només existeixen al panell de control.
 * @typedef {Object} ControlUi
 * @property {(opts?: { query?: string }) => Promise<PictoRef | null | undefined>} pickPicto
 *   Retorna la referència triada, null si es vol treure el pictograma o undefined si es cancel·la.
 * @property {(message: string) => void} announce
 * @property {() => string} newId
 * @property {(kind: 'warning' | 'end' | 'soft') => void} playSound
 * @property {(moduleId: string, value: unknown) => void} publish
 *   Envia un valor efímer a les vistes de projecció (no es desa ni passa pel store).
 *   El fa servir el sonòmetre per enviar el nivell de so unes quantes vegades per segon.
 */

/**
 * Context que rep cada vista d'un mòdul.
 * @typedef {Object} ModuleContext
 * @property {string} moduleId
 * @property {Translate} t
 * @property {(action: { type: string, payload?: any, module?: string }) => void} dispatch
 * @property {() => SharedState} getState
 * @property {() => number} now
 * @property {import('../pictograms/library.js').PictoLibrary} pictos
 * @property {ControlUi | null} ui   null a la finestra de projecció.
 */

/**
 * Vista muntada d'un mòdul.
 * @typedef {Object} View
 * @property {(state: SharedState) => void} update
 * @property {(now: number) => void} [tick]
 * @property {(value: unknown) => void} [transient]   Rep els valors de ControlUi.publish.
 * @property {() => void} destroy
 */

/**
 * Contracte comú de tots els mòduls. Vegeu README › «Com afegir un mòdul».
 * @typedef {Object} TeappModule
 * @property {string} id
 * @property {number} version
 * @property {string} nameKey
 * @property {string} icon
 * @property {'stage' | 'footer'} region   'stage' = ocupa l'escenari; 'footer' = franja inferior fixa.
 * @property {ConfigField[]} configSchema
 * @property {() => Record<string, unknown>} defaults
 * @property {(config: Record<string, unknown>, content: unknown) => any} initialState
 * @property {Record<string, Reducer>} actions
 * @property {(el: HTMLElement, ctx: ModuleContext) => View} renderControl
 * @property {(el: HTMLElement, ctx: ModuleContext) => View} renderProjection
 * @property {KeyBinding[]} [keys]
 * @property {(state: any) => unknown} [toTemplate]          Contingut que es desa a la plantilla.
 * @property {(content: unknown) => unknown} [sanitizeContent]
 * @property {(state: unknown, config: Record<string, unknown>) => any} [sanitizeState]
 * @property {(ctx: ModuleContext, state: SharedState, now: number, memo: Record<string, any>) => void} [onTick]
 *   Només s'executa al panell de control (p. ex. per fer sonar avisos una sola vegada).
 * @property {(content: unknown) => unknown} [exportContent]
 *   Treu les dades personals del contingut abans d'exportar una plantilla
 *   (p. ex. els noms dels torns). Només es manté tot si el docent ho marca.
 * @property {{ labelKey: string, icon: string, action: string }} [calmLaunch]
 *   Botó que apareix al panell mentre hi ha la pantalla de calma: executa
 *   l'acció i mostra el mòdul a l'escenari (p. ex. la respiració guiada).
 */

export {};
