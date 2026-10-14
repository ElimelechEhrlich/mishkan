import { useMemo } from 'react';
import { isInRun, toListEntries, withoutNestedSteps } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import { groupByTopic } from '../lib/lookups';
import type { TopicGroup } from '../lib/lookups';
import type { EntityWithDomains, Item } from '../types/domain';

/** The open items of every entity, grouped by topic (domain name), leaving out empty topics. */
export function useTopicSections(
  entities: readonly EntityWithDomains[],
  items: readonly Item[],
  steps: readonly Item[],
): readonly TopicGroup<ListEntry>[] {
  return useMemo(() => {
    const rows = withoutNestedSteps(items).filter(
      (item) => item.kind !== 'question' && !isInRun(item),
    );
    return groupByTopic(entities, toListEntries(rows, steps, items));
  }, [entities, items, steps]);
}
