// @ts-check
// Sons suaus generats amb Web Audio (sense fitxers d'àudio). L'atac és lent i
// el volum baix per evitar sobresalts: és un avís, no una alarma.

/** @type {AudioContext | null} */
let context = null;

function getContext() {
  if (!context) {
    const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  return context;
}

/**
 * Els navegadors només permeten àudio després d'una interacció de l'usuari.
 * Cal cridar-ho des d'un clic o una tecla.
 */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/**
 * @param {AudioContext} ctx
 * @param {number} frequency
 * @param {number} start
 * @param {number} volume
 */
function tone(ctx, frequency, start, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 1.9);
}

/**
 * @param {'warning' | 'end'} kind  'warning' = un to; 'end' = dos tons ascendents.
 * @param {number} volume           0–1
 */
export function playChime(kind, volume) {
  const ctx = getContext();
  if (!ctx || volume <= 0) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const level = 0.35 * volume;
  const t0 = ctx.currentTime + 0.05;
  if (kind === 'end') {
    tone(ctx, 523.25, t0, level); // do5
    tone(ctx, 659.25, t0 + 0.45, level); // mi5
  } else {
    tone(ctx, 587.33, t0, level); // re5
  }
}
