// @ts-check
// Icones SVG en línia (traç de 2 px, 24×24). Són decoratives: el text del botó
// o un aria-label en dona el significat.

/** @param {number} cx @param {number} cy @param {number} r */
const circle = (cx, cy, r) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** @type {Record<string, string[]>} */
const PATHS = {
  play: ['M7 4.5v15l12-7.5z'],
  pause: ['M8 5v14', 'M16 5v14'],
  next: ['M9 6l6 6-6 6'],
  prev: ['M15 6l-6 6 6 6'],
  skip: ['M5 5l9 7-9 7z', 'M19 5v14'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  up: ['M12 19V5', 'M6 11l6-6 6 6'],
  down: ['M12 5v14', 'M6 13l6 6 6-6'],
  change: ['M4 8h14l-3-3', 'M20 16H6l3 3'],
  image: ['M3 5h18v14H3z', circle(9, 10, 2), 'M21 16l-5-5-9 8'],
  screen: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
  fullscreen: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
  calm: ['M20 14.5A8 8 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z'],
  help: [circle(12, 12, 9), 'M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5V14', 'M12 17.5v.01'],
  settings: [
    'M4 6h8',
    'M16 6h4',
    'M14 4v4',
    'M4 12h2',
    'M10 12h10',
    'M8 10v4',
    'M4 18h10',
    'M18 18h2',
    'M16 16v4',
  ],
  templates: ['M8 4h12v12H8z', 'M4 8v12h12'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  upload: ['M12 20V9', 'M7 14l5-5 5 5', 'M5 4h14'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  clock: [circle(12, 12, 9), 'M12 7v5l3 2'],
  reset: ['M4 4v6h6', 'M5.6 15a7 7 0 1 0 1.5-7.2L4 10'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  swap: ['M7 7h13l-3-3', 'M17 17H4l3 3'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  timer: ['M7 3h10', 'M7 21h10', 'M8 3c0 5 8 5 8 9s-8 4-8 9', 'M16 3c0 5-8 5-8 9s8 4 8 9'],
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  columns: ['M3 5h7v14H3z', 'M14 5h7v14h-7z'],
  bell: ['M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z', 'M10 21h4'],
  sound: ['M4 9v6h4l5 4V5L8 9z', 'M16.5 9a4 4 0 0 1 0 6'],
  search: [circle(11, 11, 7), 'M20 20l-4-4'],
  info: [circle(12, 12, 9), 'M12 11v5', 'M12 8v.01'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
  done: [circle(12, 12, 9), 'M8 12.5l2.8 2.8L16 10'],
  grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  link: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  ],
  unlink: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    'M4 4l16 16',
  ],
  steps: ['M4 18h5v-4h5v-4h5V6', 'M4 18v2', 'M20 6V4'],
  board: ['M3 4h18v14H3z', 'M8 9h8', 'M8 13h5'],
  mic: ['M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'],
  micOff: ['M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3', 'M4 4l16 16'],
  people: [circle(9, 8, 3), 'M3 20a6 6 0 0 1 12 0', circle(17, 9, 2.5), 'M15 14.5a5 5 0 0 1 6 5'],
  story: ['M4 5h7v14H4z', 'M13 5h7v14h-7z', 'M6.5 9h2', 'M15.5 9h2'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  choice: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  shuffle: ['M4 7h4l8 10h4', 'M4 17h4l2-2.5', 'M14 9.5L16 7h4', 'M18 5l2 2-2 2', 'M18 15l2 2-2 2'],
  rotate: ['M4 12a8 8 0 0 1 14-5.3', 'M18 3v4h-4', 'M20 12a8 8 0 0 1-14 5.3', 'M6 21v-4h4'],
};

/**
 * @param {string} name
 * @param {{ class?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function icon(name, options = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon${options.class ? ` ${options.class}` : ''}`);
  for (const d of PATHS[name] ?? PATHS.info) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
