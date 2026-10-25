// @ts-check
// Aplica les preferències visuals al document. Els perfils només canvien
// variables CSS (vegeu styles/profiles.css), mai l'estructura.

/**
 * @param {import('./types.js').Settings} settings
 * @param {HTMLElement} [root]
 */
export function applyAppearance(settings, root = document.documentElement) {
  root.dataset.profile = settings.profile;
  root.dataset.motion = settings.motion;
  root.style.setProperty('--ui-scale', String(settings.uiScale));
  root.style.setProperty('--text-scale', String(settings.textScale));
}
