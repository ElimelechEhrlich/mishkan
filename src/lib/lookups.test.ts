import { describe, expect, it } from 'vitest';
import {
  awayAtOffset,
  carouselPlace,
  domainTopics,
  glideTarget,
  groupByTopic,
  topicDomainIds,
} from './lookups';
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
    position: null,
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

describe('carouselPlace', () => {
  it('keeps the places the carousel rests on', () => {
    expect(carouselPlace(0)).toEqual({ offset: 0, scale: 1, opacity: 1 });
    expect(carouselPlace(1)).toEqual({ offset: 78, scale: 0.62, opacity: 0.85 });
  });

  it('is part way between two places while moving, and out of sight far away', () => {
    expect(carouselPlace(0.5).offset).toBe(39);
    expect(carouselPlace(9).opacity).toBe(0);
  });
});

describe('awayAtOffset', () => {
  it('turns a carousel place back into places from the middle', () => {
    expect(awayAtOffset(0)).toBe(0);
    expect(awayAtOffset(78)).toBe(1);
    expect(awayAtOffset(carouselPlace(1.5).offset)).toBeCloseTo(1.5, 5);
    expect(awayAtOffset(-5)).toBe(0);
  });
});

describe('glideTarget', () => {
  it('goes back when hardly moved and slowly let go', () => {
    expect(glideTarget(3.1, 0, 3, 8)).toBe(3);
  });

  it('turns one place for a short swipe', () => {
    expect(glideTarget(3.3, 0, 3, 8)).toBe(4);
    expect(glideTarget(2.7, 0, 3, 8)).toBe(2);
  });

  it('goes further the faster the flick, and stops at the ends', () => {
    expect(glideTarget(3.4, 0.01, 3, 20)).toBe(6);
    expect(glideTarget(3.4, 0.03, 3, 20)).toBe(12);
    expect(glideTarget(3.4, 0.03, 3, 8)).toBe(7);
    expect(glideTarget(2.6, -0.03, 3, 8)).toBe(0);
  });
});
