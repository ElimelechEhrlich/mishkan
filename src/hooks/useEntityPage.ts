import { useMemo } from 'react';
import { useParams } from 'react-router';
import { toListEntries, withoutNestedSteps } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Lookups } from '../lib/lookups';
import type { Domain, EntityWithDomains } from '../types/domain';
import { useEntities } from './useEntities';
import type { UseEntities } from './useEntities';
import { useEntityCounts } from './useEntityCounts';
import { useItems } from './useItems';
import type { UseItems } from './useItems';
import { useLookups } from './useLookups';
import { useHouseholdContext } from './useRouteContext';

export type DomainSection = {
  readonly domain: Domain;
  readonly entries: readonly ListEntry[];
};

export type UseEntityPage = {
  readonly entities: UseEntities;
  readonly items: UseItems;
  readonly lookups: Lookups;
  /** The entity named in the URL, or undefined while loading or when it is not visible. */
  readonly entity: EntityWithDomains | undefined;
  /** Each domain of the entity with its open items. */
  readonly sections: readonly DomainSection[];
  readonly counts: ReadonlyMap<string, number>;
};

/** Everything the entity page needs about the entity in its URL. */
export function useEntityPage(): UseEntityPage {
  const { entityId } = useParams();
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const counts = useEntityCounts(items.items, lookups.domainEntities);

  const entity = entities.entities.find((candidate) => candidate.id === entityId);

  const sections = useMemo(() => {
    if (entity === undefined) {
      return [];
    }
    const rows = withoutNestedSteps(items.items).filter((item) => item.kind !== 'question');
    return entity.domains.map((domain) => ({
      domain,
      entries: toListEntries(
        rows.filter((item) => item.domain_id === domain.id),
        items.steps,
      ),
    }));
  }, [entity, items.items, items.steps]);

  return { entities, items, lookups, entity, sections, counts };
}
