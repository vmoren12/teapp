// Plugin de Vite: afegeix una Content Security Policy a les pàgines de la build.
// Només s'aplica a la build perquè el servidor de desenvolupament injecta estils
// en línia. L'única connexió externa permesa és ARASAAC (pictogrames).

const ARASAAC = 'https://api.arasaac.org https://static.arasaac.org';

const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  `img-src 'self' blob: data: ${ARASAAC}`,
  `connect-src 'self' ${ARASAAC}`,
  "font-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

/** @returns {import('vite').Plugin} */
export function contentSecurityPolicy() {
  return {
    name: 'teapp-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: POLICY },
          injectTo: 'head',
        },
      ];
    },
  };
}
