// @ts-check
// Càlculs del sonòmetre (purs, sense DOM ni àudio): de la mostra de so al
// nivell de l'escala de veu 0–4.
//
// Privacitat: només es calcula el VOLUM del moment (un número). L'àudio no es
// grava, no es desa i no s'envia enlloc; tampoc no es guarda cap historial.

import { clamp } from '../../core/schema/validate.js';

/** Nivell de soroll per defecte d'una aula en silenci (dBFS), si no s'ha calibrat. */
export const DEFAULT_QUIET_DB = -58;

/** Decibels per graó de l'escala de veu, segons la sensibilitat (1 = poc sensible). */
export const DB_PER_LEVEL = { 1: 12, 2: 10, 3: 8, 4: 6.5, 5: 5 };

export const MAX_LEVEL = 4.5;

/**
 * Volum (RMS) d'una mostra, en dBFS (0 = màxim; el silenci és molt negatiu).
 * @param {ArrayLike<number>} samples  Valors entre -1 i 1.
 */
export function rmsDb(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return rms > 0 ? 20 * Math.log10(rms) : -120;
}

/**
 * Converteix un volum en un nivell (continu) de l'escala de veu.
 * @param {number} db @param {number | null} quietDb  Calibratge (silenci de l'aula).
 * @param {number} sensitivity  1–5
 */
export function dbToLevel(db, quietDb, sensitivity) {
  const step =
    DB_PER_LEVEL[/** @type {1 | 2 | 3 | 4 | 5} */ (clamp(Math.round(sensitivity), 1, 5))];
  return clamp((db - (quietDb ?? DEFAULT_QUIET_DB)) / step, 0, MAX_LEVEL);
}

/**
 * Esmorteïment: el nivell puja i baixa a poc a poc (agulla tranquil·la, sense salts).
 * @param {number} previous @param {number} target @param {number} [factor]  0–1
 */
export const smooth = (previous, target, factor = 0.15) =>
  previous + (target - previous) * clamp(factor, 0, 1);

/**
 * Quant passa del llindar (0 = dins, 1 = clarament per sobre). Serveix per
 * canviar el color de manera gradual, mai de cop.
 * @param {number} level @param {number} limit
 */
export const overLimit = (level, limit) => clamp((level - limit) / 1.2, 0, 1);
