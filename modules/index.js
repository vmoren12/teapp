// @ts-check
// Llista de mòduls actius. Per afegir-ne un de nou: crea /modules/<nom>/,
// exporta-hi un objecte que compleixi el contracte (core/types.js › TeappModule)
// i afegeix-lo aquí. L'ordre dels mòduls d'escenari és el de les tecles 1, 2, 3…

import agenda from './agenda/index.js';
import timer from './timer/index.js';
import firstThen from './first-then/index.js';
import transitions from './transitions/index.js';

export const MODULES = [agenda, timer, firstThen, transitions];
