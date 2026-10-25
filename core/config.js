// @ts-check
// Constants de l'aplicació.

export const APP_NAME = 'pictapp';
/** Autoria i llicència del codi (peu del panell). */
export const AUTHOR = 'Víctor Moreno de la Torre';
export const CODE_LICENSE = 'EUPL-1.2';
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
/** Commit i data de la compilació: permeten veure si l'app oberta és la darrera publicada. */
export const APP_BUILD = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev';
export const APP_BUILD_DATE = typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : '';
export const REPO_URL = 'https://github.com/vmoren12/teapp';
export const SITE_URL = 'https://vmoren12.github.io/teapp/';

/** Nom del canal de sincronització entre finestres. */
export const SYNC_CHANNEL = 'teapp-sync';

/** Clau on es desen les dades de l'aplicació. */
export const DATA_KEY = 'appdata';

/** Clau de sessionStorage quan el docent no vol conservar la sessió en tancar. */
export const SESSION_LIVE_KEY = 'teapp.live';
