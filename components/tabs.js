// @ts-check
// Pestanyes accessibles (patró ARIA «tabs»): fletxes per moure's, Inici/Fi,
// i només la pestanya activa és al recorregut del tabulador.

import { h } from '../core/dom.js';
import { icon } from './icons.js';

/**
 * @param {{
 *   label: string,
 *   idPrefix: string,
 *   tabs: { id: string, label: string, icon?: string, panel: HTMLElement }[],
 *   onChange?: (id: string) => void,
 * }} options
 */
export function createTabs({ label, idPrefix, tabs, onChange }) {
  const list = h('div', { class: 'tabs__list', role: 'tablist', 'aria-label': label });
  const panels = h('div', { class: 'tabs__panels' });
  /** @type {HTMLButtonElement[]} */
  const buttons = [];

  tabs.forEach((tab, i) => {
    const tabId = `${idPrefix}-tab-${tab.id}`;
    const panelId = `${idPrefix}-panel-${tab.id}`;
    const btn = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: tabId,
        class: 'tabs__tab',
        'aria-controls': panelId,
        dataset: { tab: tab.id },
        onClick: () => select(tab.id, false),
      },
      tab.icon && icon(tab.icon),
      h('span', null, tab.label),
    );
    btn.addEventListener('keydown', (event) => {
      const rtl = getComputedStyle(list).direction === 'rtl';
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
      /** @type {number | null} */
      let target = null;
      if (event.key === forward) target = (i + 1) % tabs.length;
      else if (event.key === backward) target = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      if (target === null) return;
      event.preventDefault();
      select(tabs[target].id, true);
    });
    buttons.push(btn);
    list.append(btn);
    tab.panel.id = panelId;
    tab.panel.setAttribute('role', 'tabpanel');
    tab.panel.setAttribute('aria-labelledby', tabId);
    tab.panel.tabIndex = 0;
    tab.panel.classList.add('tabs__panel');
    panels.append(tab.panel);
  });

  /** @param {string} id @param {boolean} focus */
  function select(id, focus) {
    tabs.forEach((tab, i) => {
      const active = tab.id === id;
      buttons[i].setAttribute('aria-selected', String(active));
      buttons[i].tabIndex = active ? 0 : -1;
      tab.panel.hidden = !active;
      if (active && focus) buttons[i].focus();
    });
    onChange?.(id);
  }

  if (tabs[0]) select(tabs[0].id, false);
  return { el: h('div', { class: 'tabs' }, list, panels), select };
}
