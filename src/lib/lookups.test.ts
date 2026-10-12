import { describe, expect, it } from 'vitest';
import { domainTopics, topicDomainIds } from './lookups';
import type { EntityWithDomains } from '../types/domain';

type DomainSpec = readonly [id: string, name: string, role?: 'regular' | 'shopping' | 'debts'];

function entity(id: string, domains: readonly DomainSpec[]): EntityWithDomains {
  return {
    id,
    household_id: 'h',
    name: id,
    kind: 'child',
    member_id: null,
    id_number: null,
    sort_order: 0,
    birth_date: null,
    born_after_sunset: false,
    wedding_date: null,
    wedding_after_sunset: false,
    notes: null,
    avatar_emoji: null,
    avatar_path: null,
    created_at: '',
    avatarUrl: null,
    domains: domains.map(([domainId, name, role = 'regular']) => ({
      id: domainId,
      household_id: 'h',
      entity_id: id,
      name,
      icon: null,
      role,
      sort_order: 0,
      created_at: '',
    })),
  };
}

const entities = [
  entity('home', [
    ['h1', 'רכב'],
    ['h2', 'קניות', 'shopping'],
  ]),
  entity('a', [
    ['a1', 'חינוך'],
    ['a2', 'בריאות'],
  ]),
  entity('b', [
    ['b1', 'חינוך'],
    ['b2', ' בריאות '],
    ['b3', 'קניות', 'shopping'],
  ]),
];

describe('domainTopics', () => {
  it('lists each regular topic once, the most shared first', () => {
    expect(domainTopics(entities)).toEqual(['חינוך', 'בריאות', 'רכב']);
  });
});

describe('topicDomainIds', () => {
  it('finds the domains of a topic in every entity', () => {
    expect([...topicDomainIds(entities, 'בריאות')]).toEqual(['a2', 'b2']);
    expect(topicDomainIds(entities, 'קניות').size).toBe(0);
  });
});
