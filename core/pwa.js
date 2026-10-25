// @ts-check
// Registre del service worker (funcionament offline i instal·lació com a app).
// Només a la build: en desenvolupament la memòria cau faria més nosa que servei.

/**
 * @param {{ onUpdateReady?: (apply: () => void) => void }} [options]
 *   onUpdateReady: s'ha activat una versió nova; `apply` recarrega la pàgina per fer-la servir.
 *   No es recarrega mai sola: el docent pot estar a mitja classe.
 */
export function registerServiceWorker({ onUpdateReady } = {}) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // Si la pàgina ja estava controlada, un canvi de controlador vol dir versió nova.
  // (La primera instal·lació també el provoca, però llavors no hi ha res a actualitzar.)
  let hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) onUpdateReady?.(() => location.reload());
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
