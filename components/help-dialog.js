// @ts-check
// Ajuda: dreceres de teclat, primers passos i informació sobre l'aplicació.

import { h } from '../core/dom.js';
import { openDialog } from './dialog.js';
import { icon } from './icons.js';
import { APP_NAME, APP_VERSION, REPO_URL, SITE_URL } from '../core/config.js';

/** @typedef {import('../core/types.js').Translate} Translate */

/**
 * Nom visible d'una tecla.
 * @param {string} key @param {Translate} t
 */
export function keyLabel(key, t) {
  /** @type {Record<string, string>} */
  const names = {
    ' ': t('keys.spaceKey'),
    ArrowRight: '→',
    ArrowLeft: '←',
    PageDown: t('keys.pageDown'),
    PageUp: t('keys.pageUp'),
    Escape: 'Esc',
  };
  return names[key] ?? key.toUpperCase();
}

/** @param {string} href @param {string} text @param {Translate} t */
const link = (href, text, t) =>
  h(
    'a',
    { href, target: '_blank', rel: 'noopener noreferrer' },
    text,
    icon('external'),
    h('span', { class: 'sr-only' }, ` (${t('common.newTab')})`),
  );

/**
 * @param {{ t: Translate, shortcuts: import('../core/keyboard.js').Shortcut[] }} deps
 */
export function openHelpDialog({ t, shortcuts }) {
  return openDialog({
    t,
    title: t('help.title'),
    className: 'dialog--wide',
    body: () => {
      // Agrupem tecles iguals (p. ex. b, B i . → «B / .»).
      const rows = shortcuts.map((s) => {
        const keys = [...new Set(s.keys.map((k) => keyLabel(k, t)))];
        const params = Object.fromEntries(
          Object.entries(s.descParams ?? {}).map(([k, v]) => [k, t(v)]),
        );
        return h(
          'tr',
          null,
          h(
            'td',
            null,
            keys.flatMap((k, i) => [i > 0 ? ' / ' : '', h('kbd', null, k)]),
          ),
          h(
            'td',
            null,
            t(s.descKey, params),
            s.scope === 'control'
              ? h('span', { class: 'muted' }, ` · ${t('help.controlOnly')}`)
              : '',
          ),
        );
      });

      return [
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('help.start')),
          h(
            'ol',
            { class: 'steps' },
            ['step1', 'step2', 'step3', 'step4'].map((k) => h('li', null, t(`help.${k}`))),
          ),
        ),
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('help.shortcuts')),
          h('p', { class: 'muted' }, t('help.shortcutsHelp')),
          h(
            'table',
            { class: 'shortcuts' },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                h('th', { scope: 'col' }, t('help.key')),
                h('th', { scope: 'col' }, t('help.action')),
              ),
            ),
            h('tbody', null, rows),
          ),
        ),
        h(
          'section',
          { class: 'stack', id: 'about' },
          h('h3', { class: 'section-title' }, t('help.about', { app: APP_NAME })),
          h('p', null, t('help.aboutText')),
          h('p', null, t('help.privacy')),
          h(
            'ul',
            { class: 'link-list' },
            h('li', null, link(SITE_URL, t('help.website'), t)),
            h('li', null, link(REPO_URL, t('help.repository'), t)),
          ),
          h(
            'p',
            { class: 'muted' },
            t('help.version', { version: APP_VERSION }),
            ' · ',
            t('help.license'),
          ),
          h('p', { class: 'attribution' }, t('attribution.arasaac')),
          h('p', { class: 'muted' }, t('help.font')),
        ),
      ];
    },
  });
}
