import { describe, expect, it } from 'vitest';
import { builtInDepartment, byDepartment, departmentFor, titleKey } from './departments';
import type { ShoppingDepartment } from '../types/domain';

function department(id: string, key: string | null, position: number): ShoppingDepartment {
  return { id, household_id: 'h', name: id, key, position, created_at: '' };
}

function item(id: string, title: string): { id: string; title: string } {
  return { id, title };
}

describe('builtInDepartment', () => {
  it('finds common products', () => {
    expect(builtInDepartment('עגבניות')).toBe('produce');
    expect(builtInDepartment('חלב 3%')).toBe('dairy');
    expect(builtInDepartment('2 לחם אחיד')).toBe('bakery');
    expect(builtInDepartment('נייר טואלט')).toBe('cleaning');
    expect(builtInDepartment('חיתולים מידה 4')).toBe('baby');
  });

  it('tries names of more words first', () => {
    expect(builtInDepartment('פלפל שחור')).toBe('dry');
    expect(builtInDepartment('פלפל אדום')).toBe('produce');
    expect(builtInDepartment('סבון כלים')).toBe('cleaning');
    expect(builtInDepartment('סבון')).toBe('hygiene');
  });

  it('goes by the first known word', () => {
    expect(builtInDepartment('שוקולד חלב')).toBe('snacks');
    expect(builtInDepartment('לחם לבן')).toBe('bakery');
  });

  it('reads a word with a leading ו or ה', () => {
    expect(builtInDepartment('והחלב')).toBe('dairy');
  });

  it('leaves the unknown out', () => {
    expect(builtInDepartment('מתנה לסבתא')).toBeNull();
  });
});

describe('departmentFor', () => {
  const departments = [department('a', 'produce', 1), department('b', 'dairy', 2)];

  it('takes what was chosen for the name before', () => {
    expect(departmentFor(' עגבניות ', departments, new Map([['עגבניות', 'b']]))?.id).toBe('b');
  });

  it('falls back to the built-in, and to none when it was deleted', () => {
    expect(departmentFor('עגבניות', departments, new Map())?.id).toBe('a');
    expect(departmentFor('לחם', departments, new Map())).toBeNull();
  });
});

describe('byDepartment', () => {
  it('orders by the walk and puts the rest last', () => {
    const departments = [department('a', 'produce', 2), department('b', 'dairy', 1)];
    const groups = byDepartment(
      [item('1', 'עגבניות'), item('2', 'מתנה'), item('3', 'חלב'), item('4', 'גזר')],
      departments,
      new Map(),
    );
    expect(groups.map((group) => group.department?.id ?? null)).toEqual(['b', 'a', null]);
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual(['1', '4']);
  });
});

describe('titleKey', () => {
  it('trims, lowers and joins spaces', () => {
    expect(titleKey('  Coca   Cola ')).toBe('coca cola');
  });
});
