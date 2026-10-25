// @ts-check
// El temps es calcula sempre a partir de marques horàries (Date.now()), mai
// comptant ticks: així el control i la projecció mostren exactament el mateix
// temps restant encara que una finestra vagi lenta o es recarregui.

export const now = () => Date.now();

/**
 * Executa `callback` periòdicament mentre la pàgina és oberta.
 * @param {(now: number) => void} callback
 * @param {number} [intervalMs]
 * @returns {() => void} Funció per aturar-lo.
 */
export function startTicker(callback, intervalMs = 500) {
  const run = () => callback(Date.now());
  const id = setInterval(run, intervalMs);
  // En tornar a una pestanya que estava amagada, actualitzem de seguida.
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  document.addEventListener('visibilitychange', onVisible);
  run();
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/**
 * Format mm:ss (o h:mm:ss si cal).
 * @param {number} ms
 */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Minuts restants arrodonits cap amunt (4:01 → 5). És el que diem en veu alta.
 * @param {number} ms
 */
export function minutesLeft(ms) {
  return Math.max(0, Math.ceil(ms / 60000));
}
