import { labels } from '../constants/labels';
import type { AreaWithDomains, Member } from '../types/domain';

/** Background classes that tell areas apart, assigned by display order. */
const areaTones = [
  'bg-amber-500',
  'bg-violet-500',
  'bg-teal-600',
  'bg-rose-500',
  'bg-sky-600',
  'bg-lime-600',
] as const;

export function areaTone(index: number): string {
  return areaTones[index % areaTones.length] ?? areaTones[0];
}

export type Lookups = {
  /** Domain id to "area · domain". */
  readonly domainLabels: ReadonlyMap<string, string>;
  /** Domain id to the color class of its area. */
  readonly domainTones: ReadonlyMap<string, string>;
  readonly memberNames: ReadonlyMap<string, string>;
};

export function buildLookups(
  areas: readonly AreaWithDomains[],
  members: readonly Member[],
): Lookups {
  const domainLabels = new Map<string, string>();
  const domainTones = new Map<string, string>();
  areas.forEach((area, index) => {
    for (const domain of area.domains) {
      domainLabels.set(domain.id, `${area.name}${labels.item.separator}${domain.name}`);
      domainTones.set(domain.id, areaTone(index));
    }
  });
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  return { domainLabels, domainTones, memberNames };
}

/** The shared domain that new debts land in, found by its name. */
export function findDebtDomainId(areas: readonly AreaWithDomains[]): string | null {
  const domain = areas
    .flatMap((area) => area.domains)
    .find(
      (candidate) =>
        candidate.visibility === 'household' && candidate.name.includes(labels.debts.domainHint),
    );
  return domain?.id ?? null;
}
