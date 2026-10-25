// @ts-check
// Registre del service worker (funcionament offline i instal·lació com a app).
// Només a la build: en desenvolupament la memòria cau faria més nosa que servei.

/**
 * Quan s'activa una versió nova, la pàgina es recarrega sola (actualització
 * forçada), però només en un moment segur: si `isSafe()` diu que no (p. ex. mode
 * classe, un diàleg obert o el docent escrivint), s'espera i ho torna a provar.
 * Abans de recarregar es crida `beforeReload` (p. ex. per desar la sessió).
 * @param {{
 *   onUpdateReady?: (apply: () => void) => void,
 *   isSafe?: () => boolean,
 *   beforeReload?: () => Promise<unknown> | void,
 * }} [options]
 *   onUpdateReady: hi ha una versió nova; `apply` recarrega ja (botó del bàner).
 */
export function registerServiceWorker({ onUpdateReady, isSafe, beforeReload } = {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // Si la pàgina ja estava controlada, un canvi de controlador vol dir versió nova.
  // (La primera instal·lació també el provoca, però llavors no hi ha res a actualitzar.)
  let hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      const apply = async () => {
        await beforeReload?.();
        location.reload();
      };
      onUpdateReady?.(apply);
      if (isSafe) reloadWhenSafe(isSafe, apply);
    }
    hadController = true;
  });
  const register = async () => {
    try {
      // updateViaCache 'none': el navegador no fa servir la còpia de sw.js de la
      // memòria cau HTTP (GitHub Pages la guarda 10 min) i detecta abans les versions noves.
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      // L'app pot quedar oberta tot el dia: comprovem si hi ha versió nova en
      // tornar a la pestanya i cada 30 minuts.
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 30 * 60 * 1000);
    } catch (error) {
      console.warn("No s'ha pogut registrar el service worker", error);
    }
  };
  // L'arrencada del panell és asíncrona: sovint, quan s'arriba aquí, l'esdeveniment
  // «load» ja ha passat i esperar-lo voldria dir no registrar-lo mai.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/**
 * Recarrega quan sigui segur (ho comprova cada pocs segons).
 * @param {() => boolean} isSafe @param {() => void} reload
 */
export function reloadWhenSafe(isSafe, reload, intervalMs = 3000) {
  if (isSafe()) {
    reload();
    return () => {};
  }
  const id = setInterval(() => {
    if (!isSafe()) return;
    clearInterval(id);
    reload();
  }, intervalMs);
  return () => clearInterval(id);
}

/**
 * Finestra de projecció: quan s'activa una versió nova, es recarrega sola (és
 * una rèplica: no perd res). Si és a pantalla completa, espera que en surti.
 */
export function reloadProjectionOnUpdate() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController)
      reloadWhenSafe(
        () => !document.fullscreenElement,
        () => location.reload(),
      );
    hadController = true;
  });
}
