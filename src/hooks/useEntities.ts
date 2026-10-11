import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listEntitiesWithDomains } from '../services/entityService';
import type { EntityWithDomains } from '../types/domain';

type EntitiesState = {
  readonly entities: readonly EntityWithDomains[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseEntities = EntitiesState & {
  readonly reload: () => Promise<void>;
};

export function useEntities(): UseEntities {
  const [state, setState] = useState<EntitiesState>({ entities: [], loading: true, error: null });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const entities = await listEntitiesWithDomains();
      setState({ entities, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
