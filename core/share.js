// @ts-check
// Compartició estructural: quan la projecció rep un estat nou (que arriba
// sempre com a còpia), reaprofitem les parts que no han canviat. Així les
// vistes poden comparar referències i només redibuixen el que ha canviat.

/**
 * Retorna `next`, però amb els subarbres iguals als de `prev` substituïts per
 * les referències de `prev`. Si tot és igual, retorna `prev`.
 * @template T
 * @param {unknown} prev
 * @param {T} next
 * @returns {T}
 */
export function share(prev, next) {
  if (Object.is(prev, next)) return next;
  if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') return next;
  if (Array.isArray(prev) !== Array.isArray(next)) return next;

  const a = /** @type {Record<string, unknown>} */ (prev);
  const b = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (next));
  const keys = Object.keys(b);
  let same = Object.keys(a).length === keys.length;
  /** @type {Record<string, unknown>} */
  const out = Array.isArray(next) ? /** @type {any} */ ([]) : {};
  for (const key of keys) {
    const value = share(a[key], b[key]);
    out[key] = value;
    if (value !== a[key]) same = false;
  }
  return /** @type {T} */ (same ? prev : out);
}
