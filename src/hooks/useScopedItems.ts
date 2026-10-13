import { useMemo } from 'react';
import { circleDomainIds, domainTopics, topicDomainIds } from '../lib/lookups';
import type { EntityWithDomains, Item } from '../types/domain';
import type { UseItems } from './useItems';
import { useHouseholdContext } from './useRouteContext';

export type ScopedItems = {
  /** The chosen entity, or undefined when everything is shown. */
  readonly scope: EntityWithDomains | undefined;
  /** The topics that can be chosen within the chosen entity, or across all of them. */
  readonly topics: readonly string[];
  /** The chosen topic when it is one of `topics` and the page narrows by topic, else null. */
  readonly topic: string | null;
  readonly items: readonly Item[];
  readonly assigned: readonly Item[];
  /** Every item waiting for completion, whatever is chosen. */
  readonly incomplete: readonly Item[];
  readonly steps: readonly Item[];
  /** Open goals and issues. */
  readonly goals: readonly Item[];
  /** Open notes. */
  readonly notes: readonly Item[];
  /** Open appointments that are fully assigned. */
  readonly appointments: readonly Item[];
  /** Whether an item belongs to the chosen entity and topic; always true when nothing is chosen. */
  readonly inScope: (item: Item) => boolean;
  /** Whether an item belongs to the chosen topic, whatever its entity. */
  readonly inTopic: (item: Item) => boolean;
};

/**
 * The open items narrowed to the entity chosen for all tabs, or all of them. Pages that list
 * items by time also narrow by the chosen topic (`byTopic`); shopping and debts do not.
 */
export function useScopedItems(
  items: UseItems,
  entities: readonly EntityWithDomains[],
  byTopic = false,
): ScopedItems {
  const { scopeId, topic: chosenTopic } = useHouseholdContext();
  const scope = entities.find((entity) => entity.id === scopeId);

  return useMemo(() => {
    // With everything chosen, separate entities (circles) stay out: their topics too.
    const shared = entities.filter((entity) => entity.kind !== 'circle');
    const topics = byTopic ? domainTopics(scope === undefined ? shared : [scope]) : [];
    const topic = chosenTopic !== null && topics.includes(chosenTopic) ? chosenTopic : null;
    const topicIds = topic === null ? null : topicDomainIds(entities, topic);
    const inTopic = (item: Item): boolean =>
      topicIds === null || (item.domain_id !== null && topicIds.has(item.domain_id));
    const domainIds =
      scope === undefined ? null : new Set(scope.domains.map((domain) => domain.id));
    // Everything leaves out the items of a circle, unless one is marked to show with all.
    // A step goes with its goal or issue.
    const circleIds = circleDomainIds(entities);
    const shownWithAll = new Set(items.items.filter((item) => item.in_main).map((item) => item.id));
    const inEntity = (item: Item): boolean =>
      domainIds === null
        ? item.domain_id === null ||
          !circleIds.has(item.domain_id) ||
          item.in_main ||
          (item.parent_id !== null && shownWithAll.has(item.parent_id))
        : item.domain_id !== null && domainIds.has(item.domain_id);
    const inScope = (item: Item): boolean => inTopic(item) && inEntity(item);
    const scopedItems = items.items.filter(inScope);
    return {
      scope,
      topics,
      topic,
      items: scopedItems,
      assigned: items.assigned.filter(inScope),
      // "Needs completion" is one list for the whole home: no entity, topic or circle narrows it.
      incomplete: items.incomplete,
      steps: items.steps.filter(inScope),
      goals: scopedItems.filter((item) => item.kind === 'goal' || item.kind === 'issue'),
      // Trackers stand with the notes; one inside an issue is shown in its issue.
      notes: scopedItems.filter(
        (item) => item.kind === 'note' || (item.kind === 'tracker' && item.parent_id === null),
      ),
      appointments: items.assigned.filter((item) => inScope(item) && item.kind === 'appointment'),
      inScope,
      inTopic,
    };
  }, [
    byTopic,
    chosenTopic,
    entities,
    scope,
    items.items,
    items.assigned,
    items.incomplete,
    items.steps,
  ]);
}
