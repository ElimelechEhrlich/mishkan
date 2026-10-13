import { describe, expect, it } from 'vitest';
import { childPlacesAfterMove, inDisplayOrder } from './childOrder';
import type { Entity } from '../types/domain';

type Spec = Pick<Entity, 'id' | 'kind' | 'position' | 'birth_date' | 'created_at'>;

function child(id: string, birth: string | null, position: number | null = null): Spec {
  return { id, kind: 'child', position, birth_date: birth, created_at: id };
}

const home: Spec = { id: 'home', kind: 'home', position: null, birth_date: null, created_at: '0' };
const circle: Spec = {
  id: 'circle',
  kind: 'circle',
  position: null,
  birth_date: null,
  created_at: '0',
};

const ids = (rows: readonly Spec[]): string[] => rows.map((row) => row.id);

describe('inDisplayOrder', () => {
  it('puts the children oldest first, those with no birth date last, in their own places', () => {
    const rows = [
      home,
      child('a', null),
      child('b', '2018-01-01'),
      child('c', '2012-05-05'),
      circle,
    ];
    expect(ids(inDisplayOrder(rows))).toEqual(['home', 'c', 'b', 'a', 'circle']);
  });

  it('keeps the order set by hand, with children not yet placed after them by age', () => {
    const rows = [
      child('a', '2010-01-01', 2),
      child('b', '2015-01-01', 1),
      child('c', '2020-01-01'),
      child('d', '2008-01-01'),
    ];
    expect(ids(inDisplayOrder(rows))).toEqual(['b', 'a', 'd', 'c']);
  });
});

describe('childPlacesAfterMove', () => {
  const rows = [home, child('a', '2010-01-01'), child('b', '2014-01-01'), child('c', '2018-01-01')];

  it('swaps the child with its neighbour and places every child', () => {
    expect(childPlacesAfterMove(rows, 'c', -1)).toEqual([
      { id: 'a', position: 1 },
      { id: 'c', position: 2 },
      { id: 'b', position: 3 },
    ]);
  });

  it('does nothing past either end', () => {
    expect(childPlacesAfterMove(rows, 'a', -1)).toBeNull();
    expect(childPlacesAfterMove(rows, 'c', 1)).toBeNull();
  });
});
