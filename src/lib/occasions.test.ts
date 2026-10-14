import { describe, expect, it } from 'vitest';
import { occasionSeries } from './occasions';
import type { EntityWithDomains } from '../types/domain';

function entity(overrides: Partial<EntityWithDomains>): EntityWithDomains {
  return {
    id: 'e1',
    household_id: 'h',
    kind: 'child',
    name: 'אלי',
    member_id: null,
    sort_order: 1,
    id_number: null,
    position: null,
    birth_date: null,
    born_after_sunset: false,
    notes: null,
    wedding_date: null,
    wedding_after_sunset: false,
    avatar_emoji: null,
    avatar_path: null,
    avatarUrl: null,
    created_at: '',
    domains: [
      {
        id: 'd-dev',
        household_id: 'h',
        entity_id: 'e1',
        name: 'התפתחות',
        icon: null,
        sort_order: 1,
        role: 'regular',
        created_at: '',
      },
      {
        id: 'd-events',
        household_id: 'h',
        entity_id: 'e1',
        name: 'אירועים',
        icon: null,
        sort_order: 2,
        role: 'regular',
        created_at: '',
      },
    ],
    ...overrides,
  };
}

describe('occasionSeries', () => {
  it('repeats a week before the Hebrew birthday every year, in the events domain', () => {
    const [series] = occasionSeries([entity({ birth_date: '2016-10-28' })], '2027-10-01');
    expect(series?.prefix).toBe('birthday:e1:');
    expect(series?.title).toBe('יום הולדת עברי של אלי · כ״ו בתשרי');
    expect(series?.domainId).toBe('d-events');
    expect(series?.dates[0]).toBe('2027-10-20');
    expect(series?.dates).toHaveLength(10);
    expect(series?.dates[1]?.startsWith('2028-10')).toBe(true);
  });

  it('falls today when less than a week is left this year', () => {
    const [series] = occasionSeries([entity({ birth_date: '2016-10-28' })], '2027-10-24');
    expect(series?.dates[0]).toBe('2027-10-24');
    expect(series?.dates[1]?.startsWith('2028-')).toBe(true);
  });

  it('keeps the wedding anniversary of the couple', () => {
    const [series] = occasionSeries(
      [entity({ kind: 'couple', name: 'זוגי', wedding_date: '2010-06-15' })],
      '2026-10-11',
    );
    expect(series?.prefix).toBe('anniversary:e1:');
  });

  it('leaves the domain empty when the entity has no events domain, instead of guessing', () => {
    const plain = entity({ birth_date: '2016-10-28' });
    const [series] = occasionSeries(
      [{ ...plain, domains: plain.domains.filter((domain) => domain.id !== 'd-events') }],
      '2027-10-01',
    );
    expect(series?.domainId).toBeNull();
  });

  it('has nothing for an entity without a date, or a kind without one', () => {
    expect(occasionSeries([entity({})], '2026-10-11')).toEqual([]);
    expect(
      occasionSeries([entity({ kind: 'home', birth_date: '2016-10-28' })], '2026-10-11'),
    ).toEqual([]);
  });
});
