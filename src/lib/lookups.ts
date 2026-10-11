import { labels } from '../constants/labels';
import type { EntityWithDomains, Member, ShoppingTarget } from '../types/domain';

/** Background classes that tell entities apart, assigned by display order. */
const entityTones = [
  'bg-amber-500',
  'bg-violet-500',
  'bg-teal-600',
  'bg-rose-500',
  'bg-sky-600',
  'bg-lime-600',
] as const;

export function entityTone(index: number): string {
  return entityTones[index % entityTones.length] ?? entityTones[0];
}

export type Lookups = {
  /** Domain id to "entity · domain". */
  readonly domainLabels: ReadonlyMap<string, string>;
  /** Domain id to the color class of its entity. */
  readonly domainTones: ReadonlyMap<string, string>;
  /** Domain id to the id of its entity. */
  readonly domainEntities: ReadonlyMap<string, string>;
  readonly memberNames: ReadonlyMap<string, string>;
};

export function buildLookups(
  entities: readonly EntityWithDomains[],
  members: readonly Member[],
): Lookups {
  const domainLabels = new Map<string, string>();
  const domainTones = new Map<string, string>();
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

/** The debts domain of the home, where new debts land by default. */
export function findDebtDomainId(entities: readonly EntityWithDomains[]): string | null {
  const home = entities.find((entity) => entity.kind === 'home');
  return home?.domains.find((domain) => domain.role === 'debts')?.id ?? null;
}
