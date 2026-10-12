import { useMemo } from 'react';
import { domainTopics, topicDomainIds } from '../lib/lookups';
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
  /** Items waiting for completion, narrowed by entity only. */
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
    const topics = byTopic ? domainTopics(scope === undefined ? entities : [scope]) : [];
    const topic = chosenTopic !== null && topics.includes(chosenTopic) ? chosenTopic : null;
    const topicIds = topic === null ? null : topicDomainIds(entities, topic);
    const inTopic = (item: Item): boolean =>
      topicIds === null || (item.domain_id !== null && topicIds.has(item.domain_id));
    const domainIds =
      scope === undefined ? null : new Set(scope.domains.map((domain) => domain.id));
    const inEntity = (item: Item): boolean =>
      domainIds === null || (item.domain_id !== null && domainIds.has(item.domain_id));
    const inScope = (item: Item): boolean => inTopic(item) && inEntity(item);
    const scopedItems = items.items.filter(inScope);
    return {
      scope,
      topics,
      topic,
      items: scopedItems,
      assigned: items.assigned.filter(inScope),
      // Waiting items mostly lack a domain, so the topic leaves them be; the badge stays true.
      incomplete: items.incomplete.filter(inEntity),
      steps: items.steps.filter(inScope),
      goals: scopedItems.filter((item) => item.kind === 'goal' || item.kind === 'issue'),
      notes: scopedItems.filter((item) => item.kind === 'note'),
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
