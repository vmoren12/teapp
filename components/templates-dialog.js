// @ts-check
// Diàleg de plantilles: carregar, desar, reanomenar, duplicar, eliminar,
// exportar i importar. L'objectiu és preparar una sessió en menys de 2 minuts.

import { append, h } from '../core/dom.js';
import { openDialog, confirmDialog, promptDialog } from './dialog.js';
import { button } from './button.js';
import { icon } from './icons.js';
import {
  buildTemplatesExport,
  downloadJson,
  hasPrivateData,
  ImportError,
  readTemplatesImport,
} from '../core/io.js';

/** @typedef {import('../core/types.js').Template} Template */
/** @typedef {import('../core/types.js').AppData} AppData */

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   store: import('../core/store.js').Store<AppData>,
 *   dispatch: (action: import('../core/types.js').Action) => void,
 *   registry: import('../core/registry.js').Registry,
 *   library: import('../pictograms/library.js').PictoLibrary,
 *   announce: (message: string) => void,
 *   newId: () => string,
 *   now: () => number,
 * }} deps
 */
export function openTemplatesDialog({
  t,
  store,
  dispatch,
  registry,
  library,
  announce,
  newId,
  now,
}) {
  /** @param {string} action @param {any} payload */
  const core = (action, payload) => dispatch({ module: 'core', type: action, payload });
  const today = () => new Date(now()).toISOString().slice(0, 10);
  /** @param {string} name */
  const slug = (name) =>
    name
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'plantilla';

  /** @type {() => void} */
  let unsubscribe = () => {};

  const promise = openDialog({
    t,
    title: t('templates.title'),
    description: t('templates.description'),
    className: 'dialog--wide',
    body: (close) => {
      // Privadesa per defecte: els noms de l'alumnat (torns) només s'exporten
      // si el docent ho marca explícitament, i la casella sempre comença desmarcada.
      const includePrivate = h('input', {
        type: 'checkbox',
        id: 'tpl-include-private',
        'aria-describedby': 'tpl-include-private-hint',
      });
      const privateField = h(
        'div',
        { class: 'field field--check' },
        includePrivate,
        h('label', { for: 'tpl-include-private' }, t('templates.includePrivate')),
        h(
          'p',
          { class: 'field__hint', id: 'tpl-include-private-hint' },
          t('templates.includePrivateHint'),
        ),
      );
      /** @param {Template[]} templates */
      const exportOf = (templates) =>
        buildTemplatesExport(templates, library, now(), {
          registry,
          includePrivate: includePrivate.checked,
        });

      const list = h('ul', { class: 'template-list' });
      const empty = h('p', { class: 'empty' }, t('templates.empty'));
      const saveArea = h('div', { class: 'btn-row btn-row--wrap' });

      /** @param {Template} tpl */
      const meta = (tpl) => {
        const content = /** @type {any} */ (tpl.content.agenda);
        const activities = Array.isArray(content?.activities) ? content.activities : [];
        const minutes = activities.reduce(
          (/** @type {number} */ sum, /** @type {any} */ a) => sum + (a.durationMin || 0),
          0,
        );
        return t('templates.meta', { count: activities.length, minutes });
      };

      /** @param {Template} tpl @param {boolean} inUse */
      const row = (tpl, inUse) =>
        h(
          'li',
          { class: 'template-row', dataset: { inUse: String(inUse) } },
          h(
            'div',
            { class: 'template-row__info' },
            h(
              'h3',
              { class: 'template-row__name' },
              tpl.name,
              inUse && h('span', { class: 'tag' }, t('templates.inUse')),
            ),
            h('p', { class: 'muted' }, meta(tpl)),
          ),
          h(
            'div',
            { class: 'btn-row btn-row--wrap template-row__actions' },
            button({
              label: t('templates.load'),
              icon: 'play',
              variant: 'primary',
              attrs: { 'aria-label': t('templates.loadNamed', { name: tpl.name }) },
              onClick: async () => {
                const ok = await confirmDialog({
                  t,
                  title: t('templates.loadTitle'),
                  message: t('templates.loadConfirm', { name: tpl.name }),
                  confirmLabel: t('templates.load'),
                });
                if (!ok) return;
                core('loadTemplate', { id: tpl.id });
                announce(t('templates.loaded', { name: tpl.name }));
                close();
              },
            }),
            button({
              label: t('templates.rename'),
              icon: 'edit',
              iconOnly: true,
              variant: 'ghost',
              attrs: { 'aria-label': t('templates.renameNamed', { name: tpl.name }) },
              onClick: async () => {
                const name = await promptDialog({
                  t,
                  title: t('templates.rename'),
                  label: t('templates.nameLabel'),
                  value: tpl.name,
                  confirmLabel: t('common.save'),
                });
                if (name) core('renameTemplate', { id: tpl.id, name });
              },
            }),
            button({
              label: t('templates.duplicate'),
              icon: 'copy',
              iconOnly: true,
              variant: 'ghost',
              attrs: { 'aria-label': t('templates.duplicateNamed', { name: tpl.name }) },
              onClick: () => {
                core('duplicateTemplate', {
                  id: tpl.id,
                  newId: newId(),
                  name: t('templates.copyOf', { name: tpl.name }),
                });
                announce(t('templates.duplicated'));
              },
            }),
            button({
              label: t('templates.export'),
              icon: 'download',
              iconOnly: true,
              variant: 'ghost',
              attrs: { 'aria-label': t('templates.exportNamed', { name: tpl.name }) },
              onClick: async () => {
                downloadJson(await exportOf([tpl]), `pictapp-${slug(tpl.name)}.json`);
              },
            }),
            button({
              label: t('templates.delete'),
              icon: 'trash',
              iconOnly: true,
              variant: 'ghost',
              attrs: { 'aria-label': t('templates.deleteNamed', { name: tpl.name }) },
              onClick: async () => {
                const ok = await confirmDialog({
                  t,
                  title: t('templates.deleteTitle'),
                  message: t('templates.deleteConfirm', { name: tpl.name }),
                  confirmLabel: t('common.delete'),
                  danger: true,
                });
                if (!ok) return;
                core('deleteTemplate', { id: tpl.id });
                announce(t('templates.deleted', { name: tpl.name }));
              },
            }),
          ),
        );

      const render = () => {
        const { templates, live } = store.getState();
        list.replaceChildren(...templates.map((tpl) => row(tpl, tpl.id === live.templateId)));
        empty.hidden = templates.length > 0;

        privateField.hidden = !hasPrivateData(templates, registry);
        if (privateField.hidden) includePrivate.checked = false;

        const current = templates.find((tpl) => tpl.id === live.templateId);
        saveArea.replaceChildren();
        append(saveArea, [
          current
            ? button({
                label: t('templates.saveChanges', { name: current.name }),
                icon: 'check',
                variant: 'primary',
                onClick: () => {
                  core('saveTemplate', { id: current.id, name: current.name });
                  announce(t('templates.saved', { name: current.name }));
                },
              })
            : null,
          button({
            label: t('templates.saveAsNew'),
            icon: 'plus',
            variant: current ? 'default' : 'primary',
            onClick: async () => {
              const name = await promptDialog({
                t,
                title: t('templates.saveAsNew'),
                label: t('templates.nameLabel'),
                value: live.name || t('templates.defaultName'),
                confirmLabel: t('common.save'),
              });
              if (!name) return;
              core('saveTemplate', { id: newId(), name });
              announce(t('templates.saved', { name }));
            },
          }),
        ]);
      };
      unsubscribe = store.subscribe(render);
      render();

      const fileInput = h('input', {
        type: 'file',
        accept: 'application/json,.json',
        class: 'sr-only',
        id: 'templates-import',
      });
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        try {
          const { templates, skipped } = await readTemplatesImport(await file.text(), {
            registry,
            library,
            newId,
          });
          core('addTemplates', { templates });
          announce(
            skipped
              ? t('templates.importedSome', { count: templates.length, skipped })
              : t('templates.imported', { count: templates.length }),
          );
        } catch (error) {
          const code = error instanceof ImportError ? error.code : 'format';
          announce(t(`templates.importError.${code}`));
        }
      });

      return [
        h(
          'section',
          { class: 'stack', 'aria-labelledby': 'tpl-save' },
          h('h3', { id: 'tpl-save', class: 'section-title' }, t('templates.currentSession')),
          saveArea,
        ),
        h(
          'section',
          { class: 'stack', 'aria-labelledby': 'tpl-list' },
          h('h3', { id: 'tpl-list', class: 'section-title' }, t('templates.saved_title')),
          list,
          empty,
        ),
        h(
          'section',
          { class: 'stack', 'aria-labelledby': 'tpl-io' },
          h('h3', { id: 'tpl-io', class: 'section-title' }, t('templates.share')),
          h('p', { class: 'muted' }, t('templates.shareHelp')),
          privateField,
          h(
            'div',
            { class: 'btn-row btn-row--wrap' },
            fileInput,
            h(
              'label',
              { for: 'templates-import', class: 'btn btn--default' },
              icon('upload'),
              h('span', { class: 'btn__label' }, t('templates.import')),
            ),
            button({
              label: t('templates.exportAll'),
              icon: 'download',
              onClick: async () => {
                const { templates } = store.getState();
                downloadJson(await exportOf(templates), t('templates.fileName', { date: today() }));
              },
            }),
          ),
        ),
      ];
    },
  });
  return promise.finally(() => unsubscribe());
}
