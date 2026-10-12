import { describe, expect, it } from 'vitest';
import { domainTopics, groupByTopic, topicDomainIds } from './lookups';
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

describe('groupByTopic', () => {
  it('gathers rows of every entity under their topic and leaves out empty ones', () => {
    const rows = [
      { item: { domain_id: 'b2', kind: 'task' } },
      { item: { domain_id: 'a2', kind: 'note' } },
      { item: { domain_id: 'h2', kind: 'missing_item' } },
    ];
    const groups = groupByTopic(entities, rows);
    expect(groups.map((group) => group.topic)).toEqual(['בריאות']);
    expect(groups[0]?.rows).toHaveLength(2);
  });

  it('keeps a task left in a shopping domain, under that domain at the end', () => {
    const rows = [
      { item: { domain_id: 'b3', kind: 'task' } },
      { item: { domain_id: 'a1', kind: 'task' } },
    ];
    expect(groupByTopic(entities, rows).map((group) => group.topic)).toEqual(['חינוך', 'קניות']);
  });
});
