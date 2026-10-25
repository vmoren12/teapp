// @ts-check
// Accés al micròfon per al sonòmetre. Tot passa al navegador: un AnalyserNode
// llegeix el volum i prou. No es fa servir cap MediaRecorder, no es desa cap
// mostra i no s'envia res a cap servidor.

import { rmsDb } from './meter.js';

/**
 * @typedef {Object} Mic
 * @property {() => number} readDb  Volum actual en dBFS.
 * @property {() => void} stop      Atura el micròfon (s'apaga l'indicador del navegador).
 */

/** @returns {Promise<Mic>} */
export async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  // Sense processament automàtic: volem el volum real de l'aula.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false,
  });
  const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
  const context = new Ctor();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  return {
    readDb() {
      analyser.getFloatTimeDomainData(buffer);
      return rmsDb(buffer);
    },
    stop() {
      for (const track of stream.getTracks()) track.stop();
      source.disconnect();
      context.close().catch(() => {});
    },
  };
}
