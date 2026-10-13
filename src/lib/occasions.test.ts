import { describe, expect, it } from 'vitest';
import { occasionReminders } from './occasions';
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

describe('occasionReminders', () => {
  it('reminds a week before the Hebrew birthday, in the events domain', () => {
    const [reminder] = occasionReminders([entity({ birth_date: '2016-10-28' })], '2027-10-01');
    expect(reminder).toEqual({
      prefix: 'birthday:e1:',
      key: 'birthday:e1:2027-10-27',
      title: 'בעוד שבוע: יום הולדת עברי של אלי · כ״ו בתשרי (27 באוק׳)',
      domainId: 'd-events',
      due: '2027-10-20',
    });
  });

  it('is due today, saying how near, when less than a week is left', () => {
    const [reminder] = occasionReminders([entity({ birth_date: '2016-10-28' })], '2027-10-24');
    expect(reminder?.due).toBe('2027-10-24');
    expect(reminder?.title.startsWith('בעוד 3 ימים:')).toBe(true);
  });

  it('reminds of the wedding anniversary of the couple', () => {
    const [reminder] = occasionReminders(
      [entity({ kind: 'couple', name: 'זוגי', wedding_date: '2010-06-15' })],
      '2026-10-11',
    );
    expect(reminder?.key.startsWith('anniversary:e1:')).toBe(true);
  });

  it('leaves the domain empty when the entity has no events domain, instead of guessing', () => {
    const plain = entity({ birth_date: '2016-10-28' });
    const [reminder] = occasionReminders(
      [{ ...plain, domains: plain.domains.filter((domain) => domain.id !== 'd-events') }],
      '2027-10-01',
    );
    expect(reminder?.domainId).toBeNull();
  });

  it('has nothing for an entity without a date, or a kind without one', () => {
    expect(occasionReminders([entity({})], '2026-10-11')).toEqual([]);
    expect(
      occasionReminders([entity({ kind: 'home', birth_date: '2016-10-28' })], '2026-10-11'),
    ).toEqual([]);
  });
});
