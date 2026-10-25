// @ts-check
// Logotip de pictapp: una «p» de línia que és alhora una targeta de pictograma
// (o una bafarada: comunicar) amb una cara senzilla. Decoratiu: el nom de l'app
// sempre és al costat o al títol.

const NS = 'http://www.w3.org/2000/svg';

/** Traços del logotip (quadrícula de 32×32). La «p» va amb el color d'accent. */
export const LOGO_PATHS = {
  mark: 'M7 29V9.5A5.5 5.5 0 0 1 12.5 4h9A5.5 5.5 0 0 1 27 9.5v7a5.5 5.5 0 0 1-5.5 5.5H7',
  face: 'M13.5 13.5c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3M14 9.5v.01M20 9.5v.01',
};

/**
 * @param {{ large?: boolean }} [options]
 * @returns {SVGSVGElement}
 */
export function logo({ large = false } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', large ? 'logo logo--large' : 'logo');
  for (const [part, d] of Object.entries(LOGO_PATHS)) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', `logo__${part}`);
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
