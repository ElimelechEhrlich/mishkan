import type { Entity } from '../types/domain';

type Orderable = Pick<Entity, 'id' | 'kind' | 'position' | 'birth_date' | 'created_at'>;

/**
 * The order of two children: those a parent placed by hand first, in that order; the rest
 * oldest first by birth date, those with no birth date last, then as they were added.
 */
export function compareChildren(a: Orderable, b: Orderable): number {
  if (a.position !== null || b.position !== null) {
    if (a.position === null) {
      return 1;
    }
    if (b.position === null) {
      return -1;
    }
    if (a.position !== b.position) {
      return a.position - b.position;
    }
  } else if (a.birth_date !== b.birth_date) {
    if (a.birth_date === null) {
      return 1;
    }
    if (b.birth_date === null) {
      return -1;
    }
    return a.birth_date < b.birth_date ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * The entities in display order: everything stays where it is, and the children are
 * reordered among their own places, so the rest of the order is not touched.
 */
export function inDisplayOrder<T extends Orderable>(entities: readonly T[]): T[] {
  const children = entities.filter((entity) => entity.kind === 'child').sort(compareChildren);
  let next = 0;
  return entities.map((entity) => {
    if (entity.kind !== 'child') {
      return entity;
    }
    const child = children[next] ?? entity;
    next += 1;
    return child;
  });
}

/**
 * The places to save when a child moves one step: every child gets its place in the new
 * order, so the order a parent sees is the order kept. Null where it cannot move.
 */
export function childPlacesAfterMove(
  entities: readonly Orderable[],
  childId: string,
  step: -1 | 1,
): { readonly id: string; readonly position: number }[] | null {
  const children = entities.filter((entity) => entity.kind === 'child').sort(compareChildren);
  const from = children.findIndex((child) => child.id === childId);
  const to = from + step;
  const moving = children[from];
  const other = children[to];
  if (from === -1 || moving === undefined || other === undefined) {
    return null;
  }
  children[from] = other;
  children[to] = moving;
  return children.map((child, index) => ({ id: child.id, position: index + 1 }));
}
