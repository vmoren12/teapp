// @ts-check
// Com s'anomena cada participant: el nom (o àlies), el número o el color.

import { COLORS } from './logic.js';

/**
 * @param {import('./logic.js').TurnsState} s
 * @param {number} index
 * @param {import('../../core/types.js').Translate} t
 */
export function participantLabel(s, index, t) {
  if (s.kind === 'names') return s.names[index] ?? '';
  if (s.kind === 'colors') return t(`turns.colors.${COLORS[index] ?? COLORS[0]}`);
  return String(index + 1);
}
