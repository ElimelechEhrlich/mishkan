import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listAreasWithDomains } from '../services/areaService';
import type { AreaWithDomains } from '../types/domain';

type AreasState = {
  readonly areas: readonly AreaWithDomains[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseAreas = AreasState & {
  readonly reload: () => Promise<void>;
};

export function useAreas(): UseAreas {
  const [state, setState] = useState<AreasState>({ areas: [], loading: true, error: null });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const areas = await listAreasWithDomains();
      setState({ areas, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
