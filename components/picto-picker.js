// @ts-check
// Selector de pictogrames: desats al dispositiu (funcionen sense connexió),
// cerca a ARASAAC i imatges pròpies del docent.

import { h } from '../core/dom.js';
import { openDialog } from './dialog.js';
import { button } from './button.js';
import { createTabs } from './tabs.js';
import { pictoElement } from './tea-picto.js';
import { icon } from './icons.js';
import { searchArasaac } from '../pictograms/arasaac.js';

/** @typedef {import('../core/types.js').PictoRef} PictoRef */
/** @typedef {import('../core/types.js').Translate} Translate */
/** @typedef {import('../pictograms/library.js').PictoLibrary} PictoLibrary */

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** @param {string} text */
const normalize = (text) => text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * @param {{
 *   t: Translate,
 *   library: PictoLibrary,
 *   locale: string,
 *   query?: string,
 *   allowRemove?: boolean,
 *   announce?: (message: string) => void,
 * }} options
 * @returns {Promise<PictoRef | null | undefined>}
 *   La referència triada; null per treure el pictograma; undefined si es cancel·la.
 */
export function openPictoPicker({ t, library, locale, query = '', allowRemove = true, announce }) {
  return openDialog({
    t,
    title: t('picker.title'),
    className: 'dialog--wide picker',
    body: (close) => {
      /** @param {PictoRef} ref */
      const choose = async (ref) => {
        if (ref.source === 'arasaac') await library.saveArasaac(ref.id, ref.alt);
        close(ref);
      };

      /** @param {PictoRef} ref @param {string} label */
      const item = (ref, label) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              type: 'button',
              class: 'picker__item',
              onClick: () => choose({ ...ref, alt: label }),
            },
            pictoElement(ref, { decorative: true }),
            h('span', { class: 'picker__label' }, label),
          ),
        );

      // --- Desats -----------------------------------------------------------
      const filter = h('input', {
        type: 'search',
        class: 'input',
        value: query,
        'aria-label': t('picker.filterLabel'),
        placeholder: t('picker.filterPlaceholder'),
      });
      const savedGrid = h('ul', { class: 'picker__grid', 'aria-label': t('picker.tabSaved') });
      const savedEmpty = h('p', { class: 'muted', hidden: true }, t('picker.noMatches'));
      /** @type {{ ref: PictoRef, label: string }[]} */
      let savedItems = [];

      const renderSaved = () => {
        const q = normalize(filter.value.trim());
        const visible = savedItems.filter((it) => !q || normalize(it.label).includes(q));
        savedGrid.replaceChildren(...visible.map((it) => item(it.ref, it.label)));
        savedEmpty.hidden = visible.length > 0;
        return visible.length;
      };
      filter.addEventListener('input', renderSaved);

      // --- Cerca a ARASAAC ----------------------------------------------------
      const searchInput = h('input', {
        type: 'search',
        class: 'input',
        value: query,
        'aria-label': t('picker.searchLabel'),
        placeholder: t('picker.searchPlaceholder'),
      });
      const searchStatus = h('p', { class: 'muted', role: 'status' });
      const searchGrid = h('ul', { class: 'picker__grid', 'aria-label': t('picker.results') });
      /** @type {AbortController | null} */
      let pending = null;
      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let debounce;

      const runSearch = async () => {
        const term = searchInput.value.trim();
        pending?.abort();
        if (!term) {
          searchGrid.replaceChildren();
          searchStatus.textContent = '';
          return;
        }
        if (!navigator.onLine) {
          searchStatus.textContent = t('picker.offline');
          return;
        }
        pending = new AbortController();
        searchStatus.textContent = t('picker.searching');
        try {
          const results = await searchArasaac(term, locale, { signal: pending.signal });
          searchGrid.replaceChildren(
            ...results.map((r) => item({ source: 'arasaac', id: r.id, alt: r.label }, r.label)),
          );
          searchStatus.textContent = results.length
            ? t('picker.resultCount', { count: results.length })
            : t('picker.noResults');
        } catch (error) {
          if (/** @type {Error} */ (error).name !== 'AbortError') {
            searchStatus.textContent = t('picker.error');
          }
        }
      };
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(runSearch, 450);
      });
      const searchForm = h(
        'form',
        {
          class: 'picker__search',
          role: 'search',
          onSubmit: (/** @type {SubmitEvent} */ e) => {
            e.preventDefault();
            clearTimeout(debounce);
            runSearch();
          },
        },
        searchInput,
        h(
          'button',
          { type: 'submit', class: 'btn btn--primary' },
          icon('search'),
          h('span', { class: 'btn__label' }, t('picker.search')),
        ),
      );

      // --- Imatges pròpies ----------------------------------------------------
      const fileInput = h('input', {
        type: 'file',
        accept: 'image/png,image/jpeg,image/webp,image/gif',
        class: 'sr-only',
        id: 'picker-upload',
      });
      const ownGrid = h('ul', { class: 'picker__grid', 'aria-label': t('picker.tabOwn') });
      const ownEmpty = h('p', { class: 'muted' }, t('picker.ownEmpty'));

      const renderOwn = async () => {
        const saved = (await library.listSaved()).filter((s) => s.source === 'local');
        ownEmpty.hidden = saved.length > 0;
        ownGrid.replaceChildren(
          ...saved.map((s) => {
            const ref = /** @type {PictoRef} */ ({ source: 'local', id: s.id, alt: s.label });
            const li = item(ref, s.label || t('picker.ownImage'));
            li.append(
              button({
                label: t('picker.deleteOwn', { name: s.label || t('picker.ownImage') }),
                icon: 'trash',
                variant: 'ghost',
                iconOnly: true,
                className: 'picker__delete',
                onClick: async () => {
                  await library.remove(ref);
                  announce?.(t('picker.deleted'));
                  renderOwn();
                },
              }),
            );
            return li;
          }),
        );
      };

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
          announce?.(t('picker.tooBig'));
          return;
        }
        const label = file.name.replace(/\.[^.]+$/, '').slice(0, 60);
        const ref = await library.saveUpload(file, label);
        close(ref);
      });

      const tabs = createTabs({
        label: t('picker.title'),
        idPrefix: 'picker',
        tabs: [
          {
            id: 'saved',
            label: t('picker.tabSaved'),
            panel: h(
              'div',
              { class: 'stack' },
              h('p', { class: 'muted' }, t('picker.savedHelp')),
              filter,
              savedGrid,
              savedEmpty,
            ),
          },
          {
            id: 'search',
            label: t('picker.tabSearch'),
            panel: h('div', { class: 'stack' }, searchForm, searchStatus, searchGrid),
          },
          {
            id: 'own',
            label: t('picker.tabOwn'),
            panel: h(
              'div',
              { class: 'stack' },
              h('p', { class: 'muted' }, t('picker.ownHelp')),
              h(
                'div',
                null,
                fileInput,
                h(
                  'label',
                  { for: 'picker-upload', class: 'btn btn--primary' },
                  icon('upload'),
                  h('span', { class: 'btn__label' }, t('picker.upload')),
                ),
              ),
              ownGrid,
              ownEmpty,
            ),
          },
        ],
        onChange: (id) => {
          if (id === 'own') renderOwn();
          if (id === 'search') searchInput.focus();
        },
      });

      // Carrega els desats: paquet inicial + ARASAAC baixats prèviament.
      (async () => {
        const starter = library.starterItems().map((s) => ({
          ref: /** @type {PictoRef} */ ({ source: 'arasaac', id: s.id, alt: '' }),
          label: t(`starter.${s.key}`),
        }));
        const downloaded = (await library.listSaved())
          .filter((s) => s.source === 'arasaac')
          .map((s) => ({
            ref: /** @type {PictoRef} */ ({ source: 'arasaac', id: s.id, alt: '' }),
            label: s.label,
          }));
        savedItems = [...downloaded, ...starter.sort((a, b) => a.label.localeCompare(b.label))];
        const matches = renderSaved();
        // Si no hi ha cap pictograma desat que coincideixi, cerquem directament.
        if (query && matches === 0 && navigator.onLine) {
          tabs.select('search', false);
          runSearch();
        } else {
          filter.focus();
        }
      })();

      return [
        tabs.el,
        h(
          'div',
          { class: 'dialog__actions dialog__actions--split' },
          h('p', { class: 'attribution' }, t('attribution.arasaac')),
          h(
            'div',
            { class: 'btn-row' },
            allowRemove &&
              button({ label: t('picker.remove'), icon: 'trash', onClick: () => close(null) }),
            button({ label: t('common.cancel'), onClick: () => close(undefined) }),
          ),
        ),
      ];
    },
  });
}
