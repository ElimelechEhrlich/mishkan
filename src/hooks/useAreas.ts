import { useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listAreasWithDomains } from '../services/areaService';
import type { AreaWithDomains } from '../types/domain';

type UseAreas = {
  readonly areas: readonly AreaWithDomains[];
  readonly loading: boolean;
  readonly error: string | null;
};

export function useAreas(): UseAreas {
  const [state, setState] = useState<UseAreas>({ areas: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    listAreasWithDomains()
      .then((areas) => {
        if (active) {
          setState({ areas, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ areas: [], loading: false, error: toMessage(error) });
        }
      });
    return (): void => {
      active = false;
    };
  }, []);

  return state;
}
