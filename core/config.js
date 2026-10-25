// @ts-check
// Constants de l'aplicació.

export const APP_NAME = 'TEApp';
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
export const REPO_URL = 'https://github.com/vmoren12/teapp';
export const SITE_URL = 'https://vmoren12.github.io/teapp/';

/** Nom del canal de sincronització entre finestres. */
export const SYNC_CHANNEL = 'teapp-sync';

/** Clau on es desen les dades de l'aplicació. */
export const DATA_KEY = 'appdata';

/** Clau de sessionStorage quan el docent no vol conservar la sessió en tancar. */
export const SESSION_LIVE_KEY = 'teapp.live';
