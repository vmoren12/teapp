// @ts-check
// Registre del service worker (funcionament offline i instal·lació com a app).
// Només a la build: en desenvolupament la memòria cau faria més nosa que servei.

/**
 * @param {{ onUpdateReady?: (apply: () => void) => void }} [options]
 *   onUpdateReady: hi ha una versió nova esperant; `apply` la activa i recarrega.
 */
export function registerServiceWorker({ onUpdateReady } = {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const offer = () => {
        const waiting = reg.waiting;
        if (!waiting || !navigator.serviceWorker.controller) return;
        onUpdateReady?.(() => {
          reloading = true;
          waiting.postMessage('skip-waiting');
        });
      };
      offer();
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', offer);
      });
    } catch (error) {
      console.warn("No s'ha pogut registrar el service worker", error);
    }
  });
}
