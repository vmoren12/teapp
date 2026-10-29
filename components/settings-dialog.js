// @ts-check
// Configuració: perfil visual, mida del text, moviment, so, idioma i privadesa.
// Els canvis s'apliquen a l'instant (també a la projecció) perquè el docent
// vegi l'efecte mentre tria.

import { h } from '../core/dom.js';
import { openDialog, confirmDialog } from './dialog.js';
import { button } from './button.js';
import { MOTIONS, PROFILES, TEXT_SCALES, UI_SCALES } from '../core/schema/validate.js';
import { LOCALES } from '../i18n/index.js';
import { CLOCK_POSITIONS, FOOTER_SIZES, HEADER_SIZES } from '../core/layout.js';

/** @typedef {import('../core/types.js').Settings} Settings */

/**
 * @param {{
 *   t: import('../core/types.js').Translate,
 *   store: import('../core/store.js').Store<import('../core/types.js').AppData>,
 *   dispatch: (action: import('../core/types.js').Action) => void,
 *   playSound: (kind: 'warning' | 'end') => void,
 *   onLocaleChange: (code: string) => void,
 *   onClearData: () => void,
 *   storageKind: string,
 * }} deps
 */
export function openSettingsDialog({
  t,
  store,
  dispatch,
  playSound,
  onLocaleChange,
  onClearData,
  storageKind,
}) {
  /** @param {Partial<Settings>} patch */
  const set = (patch) => dispatch({ module: 'core', type: 'updateSettings', payload: patch });
  const settings = () => store.getState().settings;
  /** @param {number} n */
  const percent = (n) => `${Math.round(n * 100)} %`;

  return openDialog({
    t,
    title: t('settings.title'),
    className: 'dialog--wide',
    body: () => {
      const s = settings();

      // --- Perfil visual ------------------------------------------------------
      const profiles = h(
        'fieldset',
        { class: 'field' },
        h('legend', { class: 'field__label' }, t('settings.profile')),
        h(
          'div',
          { class: 'choice-cards' },
          PROFILES.map((profile) => {
            const input = h('input', {
              type: 'radio',
              name: 'profile',
              value: profile,
              checked: s.profile === profile,
            });
            input.addEventListener('change', () => input.checked && set({ profile }));
            return h(
              'label',
              { class: 'choice-card', dataset: { preview: profile } },
              input,
              h('span', { class: 'choice-card__title' }, t(`settings.profiles.${profile}`)),
              h('span', { class: 'choice-card__desc' }, t(`settings.profiles.${profile}Desc`)),
            );
          }),
        ),
      );

      /**
       * Control lliscant sobre una llista de valors permesos.
       * @param {string} id @param {string} label @param {number[]} values @param {number} value
       * @param {(v: number) => void} onChange
       */
      const scale = (id, label, values, value, onChange) => {
        const output = h('output', { for: id, class: 'field__value' }, percent(value));
        const input = h('input', {
          type: 'range',
          id,
          min: 0,
          max: values.length - 1,
          step: 1,
          value: Math.max(0, values.indexOf(value)),
          'aria-valuetext': percent(value),
        });
        input.addEventListener('input', () => {
          const v = values[Number(input.value)];
          output.textContent = percent(v);
          input.setAttribute('aria-valuetext', percent(v));
          onChange(v);
        });
        return h(
          'div',
          { class: 'field' },
          h(
            'div',
            { class: 'field__row' },
            h('label', { for: id, class: 'field__label' }, label),
            output,
          ),
          input,
        );
      };

      const motion = h(
        'select',
        { id: 'set-motion', class: 'input' },
        MOTIONS.map((m) =>
          h('option', { value: m, selected: s.motion === m }, t(`settings.motions.${m}`)),
        ),
      );
      motion.addEventListener('change', () =>
        set({ motion: /** @type {Settings['motion']} */ (motion.value) }),
      );

      // --- Franges de la projecció per a les sessions noves -----------------------
      /**
       * @param {'header' | 'footer' | 'clock'} band @param {readonly string[]} values
       * @param {string} [optionsKey]  Prefix de les etiquetes de les opcions.
       */
      const bandSelect = (band, values, optionsKey = 'layout.sizes') => {
        const id = `set-layout-${band}`;
        const select = h(
          'select',
          { id, class: 'input' },
          values.map((v) =>
            h('option', { value: v, selected: s.layout[band] === v }, t(`${optionsKey}.${v}`)),
          ),
        );
        select.addEventListener('change', () =>
          set({ layout: { ...settings().layout, [band]: select.value } }),
        );
        return h(
          'div',
          { class: 'field' },
          h('label', { for: id, class: 'field__label' }, t(`layout.${band}`)),
          select,
        );
      };

      // --- So -------------------------------------------------------------------
      const soundOn = h('input', { type: 'checkbox', id: 'set-sound', checked: s.sound.enabled });
      soundOn.addEventListener('change', () =>
        set({ sound: { ...settings().sound, enabled: soundOn.checked } }),
      );
      const volume = h('input', {
        type: 'range',
        id: 'set-volume',
        min: 0,
        max: 100,
        step: 10,
        value: Math.round(s.sound.volume * 100),
        'aria-valuetext': percent(s.sound.volume),
      });
      volume.addEventListener('input', () => {
        const v = Number(volume.value) / 100;
        volume.setAttribute('aria-valuetext', percent(v));
        set({ sound: { ...settings().sound, volume: v } });
      });

      // --- Idioma ---------------------------------------------------------------
      const locale = h(
        'select',
        { id: 'set-locale', class: 'input' },
        LOCALES.map((l) =>
          h('option', { value: l.code, selected: s.locale === l.code, lang: l.code }, l.name),
        ),
      );
      locale.addEventListener('change', () => {
        set({ locale: locale.value });
        onLocaleChange(locale.value);
      });

      // --- Privadesa ------------------------------------------------------------
      const keep = h('input', {
        type: 'checkbox',
        id: 'set-keep',
        checked: s.keepSession,
        'aria-describedby': 'set-keep-hint',
      });
      keep.addEventListener('change', () => set({ keepSession: keep.checked }));

      return [
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('settings.display')),
          profiles,
          scale('set-text', t('settings.textScale'), TEXT_SCALES, s.textScale, (v) =>
            set({ textScale: v }),
          ),
          scale('set-ui', t('settings.uiScale'), UI_SCALES, s.uiScale, (v) => set({ uiScale: v })),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'set-motion', class: 'field__label' }, t('settings.motion')),
            motion,
          ),
          h('h4', { class: 'field__label' }, t('settings.layoutDefault')),
          h('p', { class: 'field__hint' }, t('settings.layoutDefaultHint')),
          bandSelect('header', HEADER_SIZES),
          bandSelect('footer', FOOTER_SIZES),
          bandSelect('clock', CLOCK_POSITIONS, 'layout.clocks'),
        ),
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('settings.sound')),
          h(
            'div',
            { class: 'field field--check' },
            soundOn,
            h('label', { for: 'set-sound' }, t('settings.soundEnabled')),
          ),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'set-volume', class: 'field__label' }, t('settings.volume')),
            volume,
          ),
          h(
            'div',
            { class: 'btn-row' },
            button({
              label: t('settings.testSound'),
              icon: 'sound',
              onClick: () => playSound('end'),
            }),
          ),
        ),
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('settings.language')),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'set-locale', class: 'field__label' }, t('settings.languageLabel')),
            locale,
            h('p', { class: 'field__hint' }, t('settings.languageHint')),
          ),
        ),
        h(
          'section',
          { class: 'stack' },
          h('h3', { class: 'section-title' }, t('settings.privacy')),
          h(
            'p',
            { class: 'muted' },
            t('settings.privacyText', { storage: t(`settings.storage.${storageKind}`) }),
          ),
          h(
            'div',
            { class: 'field field--check' },
            keep,
            h('label', { for: 'set-keep' }, t('settings.keepSession')),
            h('p', { class: 'field__hint', id: 'set-keep-hint' }, t('settings.keepSessionHint')),
          ),
          h(
            'div',
            { class: 'btn-row' },
            button({
              label: t('settings.clearData'),
              icon: 'trash',
              variant: 'danger',
              onClick: async () => {
                const ok = await confirmDialog({
                  t,
                  title: t('settings.clearData'),
                  message: t('settings.clearConfirm'),
                  confirmLabel: t('settings.clearData'),
                  danger: true,
                });
                if (ok) onClearData();
              },
            }),
          ),
        ),
      ];
    },
  });
}
