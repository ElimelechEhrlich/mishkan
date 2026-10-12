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
export type EntityGroupKey = 'home' | 'parents' | 'children';

export function entityGroupOf(kind: EntityKind): EntityGroupKey {
  if (kind === 'home' || kind === 'couple') {
    return 'home';
  }
  return kind === 'child' ? 'children' : 'parents';
}

/** Entities in their groups, in display order; empty groups are left out. */
export function groupEntities<T extends { readonly kind: EntityKind }>(
  entities: readonly T[],
): { readonly key: EntityGroupKey; readonly entities: readonly T[] }[] {
  const order: readonly EntityGroupKey[] = ['home', 'parents', 'children'];
  return order
    .map((key) => ({
      key,
      entities: entities.filter((entity) => entityGroupOf(entity.kind) === key),
    }))
    .filter((group) => group.entities.length > 0);
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
