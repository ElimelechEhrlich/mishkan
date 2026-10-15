import { useCallback, useEffect, useState } from 'react';
import { isRowList, readCache, writeCache } from '../lib/cache';
import { toMessage } from '../lib/errors';
import { onAppReturn } from '../lib/itemChanges';
import { listEntitiesWithDomains } from '../services/entityService';
import type { EntityWithDomains } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

function isEntityList(value: unknown): value is EntityWithDomains[] {
  return (
    isRowList(value) &&
    Array.isArray(value) &&
    value.every(
      (entity: unknown) =>
        typeof entity === 'object' &&
        entity !== null &&
        'domains' in entity &&
        isRowList(entity.domains),
    )
  );
}

type EntitiesState = {
  readonly entities: readonly EntityWithDomains[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseEntities = EntitiesState & {
  readonly reload: () => Promise<void>;
};

/** The entities as last loaded on this device, without loading them again. */
export function cachedEntities(memberId: string): readonly EntityWithDomains[] {
  return readCache(`entities.${memberId}`, isEntityList) ?? [];
}

export function useEntities(): UseEntities {
  const { member } = useHouseholdContext();
  const cacheKey = `entities.${member.id}`;
  // What was loaded last time shows at once; the fresh copy replaces it when it arrives.
  const [state, setState] = useState<EntitiesState>(() => {
    const cached = readCache(cacheKey, isEntityList);
    return { entities: cached ?? [], loading: cached === null, error: null };
  });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const entities = await listEntitiesWithDomains();
      setState({ entities, loading: false, error: null });
      writeCache(cacheKey, entities);
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, [cacheKey]);

  useEffect(() => {
    void reload();
    // Back in the app: the other parent may have added a child or a domain meanwhile.
    return onAppReturn(() => {
      void reload();
    });
  }, [reload]);

  return { ...state, reload };
}
