// @ts-check
// Escala de veu de 0 a 4. La fan servir les expectatives («Com parlo?») i el
// sonòmetre de grup, perquè l'alumnat la reconegui sempre igual.

/** Nivells de l'escala: 0 silenci · 1 xiuxiueig · 2 parella · 3 grup · 4 tota la classe. */
export const VOICE_LEVELS = [0, 1, 2, 3, 4];

/** @param {unknown} value @returns {number | null} */
export const sanitizeVoice = (value) =>
  typeof value === 'number' && VOICE_LEVELS.includes(value) ? value : null;

/** Clau i18n del nom d'un nivell. @param {number} level */
export const voiceKey = (level) => `voice.l${level}`;
