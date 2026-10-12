import { labels } from '../constants/labels';
import type { EntityKind, EntityWithDomains, Item, Member, ShoppingTarget } from '../types/domain';

/** The classes of one entity color: a fill, a frame and text. */
export type EntityTone = {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
};

/** The entity colors from index.css, assigned by display order. */
const entityTones = [
  { bg: 'bg-entity-1', border: 'border-entity-1', text: 'text-entity-1' },
  { bg: 'bg-entity-2', border: 'border-entity-2', text: 'text-entity-2' },
  { bg: 'bg-entity-3', border: 'border-entity-3', text: 'text-entity-3' },
  { bg: 'bg-entity-4', border: 'border-entity-4', text: 'text-entity-4' },
  { bg: 'bg-entity-5', border: 'border-entity-5', text: 'text-entity-5' },
  { bg: 'bg-entity-6', border: 'border-entity-6', text: 'text-entity-6' },
] as const satisfies readonly EntityTone[];

export function entityTone(index: number): EntityTone {
  return entityTones[index % entityTones.length] ?? entityTones[0];
}

export type Lookups = {
  /** Domain id to "entity · domain". */
  readonly domainLabels: ReadonlyMap<string, string>;
  /** Domain id to the color of its entity. */
  readonly domainTones: ReadonlyMap<string, EntityTone>;
  /** Domain id to the id of its entity. */
  readonly domainEntities: ReadonlyMap<string, string>;
  readonly memberNames: ReadonlyMap<string, string>;
};

export function buildLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  const domainLabels = new Map<string, string>();
  const domainTones = new Map<string, EntityTone>();
  const domainEntities = new Map<string, string>();
  entities.forEach((entity, index) => {
    for (const domain of entity.domains) {
      domainLabels.set(domain.id, `${entity.name}${labels.item.separator}${domain.name}`);
      domainTones.set(domain.id, entityTone(index));
      domainEntities.set(domain.id, entity.id);
    }
  });
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  return { domainLabels, domainTones, domainEntities, memberNames };
}

/** Every entity with its shopping domain, the home first: most missing items are for it. */
export function shoppingTargets(entities: readonly EntityWithDomains[]): ShoppingTarget[] {
  const targets: ShoppingTarget[] = [];
  for (const entity of entities) {
    const shoppingDomain = entity.domains.find((domain) => domain.role === 'shopping');
    if (shoppingDomain !== undefined) {
      targets.push({ entity, domainId: shoppingDomain.id });
    }
  }
  return targets.sort(
    (a, b) => Number(b.entity.kind === 'home') - Number(a.entity.kind === 'home'),
  );
}

/** Entities that hold a debts domain, with that domain's id; the home first. */
export function debtHolders(
  entities: readonly EntityWithDomains[],
): { readonly entity: EntityWithDomains; readonly domainId: string }[] {
  const holders: { readonly entity: EntityWithDomains; readonly domainId: string }[] = [];
  for (const entity of entities) {
    const debts = entity.domains.find((domain) => domain.role === 'debts');
    if (debts !== undefined) {
      holders.push({ entity, domainId: debts.id });
    }
  }
  return holders.sort(
    (a, b) => Number(b.entity.kind === 'home') - Number(a.entity.kind === 'home'),
  );
}

/** How many open rows each entity holds, by entity id. Questions and nested steps are not counted. */
export function countByEntity(
  rows: readonly Item[],
  domainEntities: ReadonlyMap<string, string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of rows) {
    const entityId = item.domain_id === null ? undefined : domainEntities.get(item.domain_id);
    if (entityId !== undefined && item.kind !== 'question') {
      counts.set(entityId, (counts.get(entityId) ?? 0) + 1);
    }
  }
  return counts;
}

/** The groups entities are shown in: the home and the couple, the parents, the children. */
export type EntityGroupKey = 'home' | 'parents' | 'children' | 'circles';

export function entityGroupOf(kind: EntityKind): EntityGroupKey {
  if (kind === 'home' || kind === 'couple') {
    return 'home';
  }
  if (kind === 'circle') {
    return 'circles';
  }
  return kind === 'child' ? 'children' : 'parents';
}

/** Entities in their groups, in display order; empty groups are left out. */
export function groupEntities<T extends { readonly kind: EntityKind }>(
  entities: readonly T[],
): { readonly key: EntityGroupKey; readonly entities: readonly T[] }[] {
  const order: readonly EntityGroupKey[] = ['home', 'parents', 'children', 'circles'];
  return order
    .map((key) => ({
      key,
      entities: entities.filter((entity) => entityGroupOf(entity.kind) === key),
    }))
    .filter((group) => group.entities.length > 0);
}

/** How many places on each side of the chosen one the entity carousel shows. */
export const carouselReach = 2;

/**
 * How far "everything" may be from the chosen one and still show in the carousel; beyond
 * that it moves up to the header.
 */
export const everythingReach = 1;

/** The choices of the entity carousel in order: everything (null) first, then each entity. */
export function scopeOptions(
  entities: readonly { readonly id: string; readonly kind: EntityKind }[],
): (string | null)[] {
  return [null, ...groupEntities(entities).flatMap((group) => group.entities.map((e) => e.id))];
}

/** The name of a domain as a topic shared across entities, such as בריאות. */
function topicName(name: string): string {
  return name.trim();
}

/**
 * The topics of the regular domains: each name once, the ones most entities share first,
 * then in the order the entities come. Shopping and debts are left out; they have tabs of
 * their own.
 */
export function domainTopics(entities: readonly EntityWithDomains[]): string[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    for (const domain of entity.domains) {
      if (domain.role === 'regular') {
        const name = topicName(domain.name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  const firstSeen = [...counts.keys()];
  return [...firstSeen].sort(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || firstSeen.indexOf(a) - firstSeen.indexOf(b),
  );
}

/** The ids of every domain of a topic, across all entities. */
export function topicDomainIds(
  entities: readonly EntityWithDomains[],
  topic: string,
): ReadonlySet<string> {
  return new Set(
    entities.flatMap((entity) =>
      entity.domains
        .filter((domain) => domain.role === 'regular' && topicName(domain.name) === topic)
        .map((domain) => domain.id),
    ),
  );
}

/** One topic across all entities, with the open rows of every domain of that name. */
export type TopicGroup<T> = {
  readonly topic: string;
  readonly rows: readonly T[];
};

/** Kinds that belong in a shopping or debts domain, and are shown in tabs of their own. */
const systemKinds: readonly string[] = ['missing_item', 'shopping_run', 'debt'];

/**
 * Rows grouped by the topic of their domain, in the order of `domainTopics`. Missing items,
 * runs and debts are left out, as their domains have tabs of their own; anything else in a
 * shopping or debts domain (such as a task converted from a missing item) is grouped under
 * that domain's name at the end, so nothing goes missing. Topics with nothing in them are
 * left out.
 */
export function groupByTopic<
  T extends { readonly item: { readonly domain_id: string | null; readonly kind: string } },
>(entities: readonly EntityWithDomains[], rows: readonly T[]): TopicGroup<T>[] {
  const topicOf = new Map<string, string>();
  const systemTopics: string[] = [];
  for (const entity of entities) {
    for (const domain of entity.domains) {
      const name = topicName(domain.name);
      topicOf.set(domain.id, name);
      if (domain.role !== 'regular' && !systemTopics.includes(name)) {
        systemTopics.push(name);
      }
    }
  }
  const regular = domainTopics(entities);
  const shown = rows.filter((row) => !systemKinds.includes(row.item.kind));
  return [...regular, ...systemTopics.filter((topic) => !regular.includes(topic))]
    .map((topic) => ({
      topic,
      rows: shown.filter(
        (row) => row.item.domain_id !== null && topicOf.get(row.item.domain_id) === topic,
      ),
    }))
    .filter((group) => group.rows.length > 0);
}

/**
 * Whether an item belongs to a separate entity (a circle, such as family and friends) and
 * stays out of the views of everything: unless it is marked to show there.
 */
export function circleDomainIds(entities: readonly EntityWithDomains[]): ReadonlySet<string> {
  return new Set(
    entities
      .filter((entity) => entity.kind === 'circle')
      .flatMap((entity) => entity.domains.map((domain) => domain.id)),
  );
}

/** The household's first circle, the one the carousel's corner button opens. */
export function mainCircle<T extends { readonly kind: EntityKind; readonly created_at: string }>(
  entities: readonly T[],
): T | undefined {
  return entities
    .filter((entity) => entity.kind === 'circle')
    .reduce<
      T | undefined
    >((first, entity) => (first === undefined || entity.created_at < first.created_at ? entity : first), undefined);
}

/** The shortest move of a finger that turns the carousel. */
const swipeMin = 40;

/**
 * How many places a swipe turns the carousel: one for a slow or short one, more the faster
 * and longer the finger moved. `distance` is in pixels, `ms` how long the finger was down.
 */
export function swipeSteps(distance: number, ms: number): number {
  const length = Math.abs(distance);
  if (length < swipeMin) {
    return 0;
  }
  const speed = length / Math.max(ms, 1);
  const bySpeed = speed > 0.5 ? Math.floor((speed - 0.5) / 0.35) : 0;
  const byLength = Math.floor(length / 160);
  return 1 + Math.max(bySpeed, byLength);
}
