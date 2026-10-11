import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import { createDomain, createEntity } from '../services/entityService';
import type { EntityWithDomains } from '../types/domain';
import { nextSortOrder } from './useEntitySettings';
import { useHouseholdContext } from './useRouteContext';

export type UseQuickStructure = {
  readonly error: string | null;
  /** Adds a domain to an entity; resolves to its id, or null when it failed. */
  readonly addDomain: (entity: EntityWithDomains, name: string) => Promise<string | null>;
  /** Adds a child; resolves to its id, or null when it failed. */
  readonly addChild: (name: string) => Promise<string | null>;
};

/** Adding a domain or a child while adding an item, without going to settings. */
export function useQuickStructure(
  entities: readonly EntityWithDomains[],
  onChanged: () => Promise<void>,
): UseQuickStructure {
  const { member } = useHouseholdContext();
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (change: () => Promise<string>): Promise<string | null> => {
      try {
        const id = await change();
        await onChanged();
        setError(null);
        return id;
      } catch (caught: unknown) {
        setError(toMessage(caught));
        return null;
      }
    },
    [onChanged],
  );

  const addDomain = useCallback(
    (entity: EntityWithDomains, name: string): Promise<string | null> =>
      create(() =>
        createDomain({
          entityId: entity.id,
          name,
          role: 'regular',
          sortOrder: nextSortOrder(entity.domains.filter((domain) => domain.role !== 'shopping')),
        }),
      ),
    [create],
  );

  const addChild = useCallback(
    (name: string): Promise<string | null> =>
      create(() =>
        createEntity({
          householdId: member.household_id,
          kind: 'child',
          name,
          sortOrder: nextSortOrder(entities),
        }),
      ),
    [create, member.household_id, entities],
  );

  return { error, addDomain, addChild };
}
