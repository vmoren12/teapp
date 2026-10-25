// @ts-check
// Alçada de les franges de la projecció (Ara → Després a dalt, avisos a baix).
// L'escenari ocupa l'espai que queda. Les alçades van en passos fixos i en
// unitats «em» de la projecció, de manera que també creixen amb la mida del text.
//
// Es desa a la sessió (`live.config.layout`), i per tant a les plantilles, i hi
// ha un valor general a la configuració (`settings.layout`) per a les sessions noves.

// Aquest fitxer no importa res: el fan servir tant la validació (core/schema)
// com la projecció.

/** @typedef {import('./types.js').Layout} Layout */

/** Clau de `live.config` reservada per a les franges (cap mòdul es pot dir així). */
export const LAYOUT_KEY = 'layout';

export const HEADER_SIZES = /** @type {const} */ ([
  'hidden',
  'small',
  'medium',
  'large',
  'xlarge',
  'xxlarge',
  'huge',
]);
// La franja inferior no es pot amagar: hi ha d'haver lloc per als avisos de transició.
export const FOOTER_SIZES = /** @type {const} */ ([
  'small',
  'medium',
  'large',
  'xlarge',
  'xxlarge',
  'huge',
]);

/**
 * Alçada de cada pas, en «em» de la projecció. «medium» és la mida de sempre.
 * Els passos grans permeten que «Ara → Després» o els avisos ocupin bona part
 * de la pantalla (el contingut de la franja creix amb ella).
 */
export const HEADER_EM = {
  hidden: 0,
  small: 1.6,
  medium: 2.25,
  large: 3.4,
  xlarge: 5,
  xxlarge: 7,
  huge: 9.5,
};
export const FOOTER_EM = {
  small: 2.4,
  medium: 3.2,
  large: 4.6,
  xlarge: 6.5,
  xxlarge: 8.5,
  huge: 11,
};

/** @type {import('./types.js').ConfigField[]} */
export const LAYOUT_SCHEMA = [
  {
    key: 'header',
    type: 'select',
    labelKey: 'layout.header',
    options: HEADER_SIZES.map((value) => ({ value, labelKey: `layout.sizes.${value}` })),
  },
  {
    key: 'footer',
    type: 'select',
    labelKey: 'layout.footer',
    options: FOOTER_SIZES.map((value) => ({ value, labelKey: `layout.sizes.${value}` })),
  },
];

/** @returns {Layout} */
export const defaultLayout = () => ({ header: 'medium', footer: 'medium' });

/**
 * @param {unknown} input
 * @param {Layout} [fallback]
 * @returns {Layout}
 */
export function sanitizeLayout(input, fallback = defaultLayout()) {
  const source =
    input && typeof input === 'object' ? /** @type {Record<string, unknown>} */ (input) : {};
  /** @type {readonly unknown[]} */
  const headers = HEADER_SIZES;
  /** @type {readonly unknown[]} */
  const footers = FOOTER_SIZES;
  return {
    header: headers.includes(source.header)
      ? /** @type {Layout['header']} */ (source.header)
      : fallback.header,
    footer: footers.includes(source.footer)
      ? /** @type {Layout['footer']} */ (source.footer)
      : fallback.footer,
  };
}

/** @param {import('./types.js').LiveSession} live @returns {Layout} */
export const liveLayout = (live) => sanitizeLayout(live.config[LAYOUT_KEY]);
