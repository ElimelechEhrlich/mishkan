import { useMemo } from 'react';
import type { ListEntry } from '../lib/itemRules';
import { groupByTopic } from '../lib/lookups';
import type { TopicGroup } from '../lib/lookups';
import type { EntityWithDomains } from '../types/domain';

/**
 * The rows of a tab grouped by domain: with an entity chosen, its own domains; with
 * everything, each domain name across all entities. Empty domains are left out.
 */
export function useDomainGroups(
  entries: readonly ListEntry[],
  entities: readonly EntityWithDomains[],
  scope: EntityWithDomains | undefined,
): readonly TopicGroup<ListEntry>[] {
  return useMemo(
    () => groupByTopic(scope === undefined ? entities : [scope], entries),
    [entries, entities, scope],
  );
}
