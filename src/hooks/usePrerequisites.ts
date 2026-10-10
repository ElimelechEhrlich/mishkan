import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  addCondition,
  addDependency,
  listPrerequisites,
  removePrerequisite,
  setConditionMet,
} from '../services/prerequisiteService';
import type { Prerequisite } from '../types/domain';

type PrerequisitesState = {
  readonly prerequisites: readonly Prerequisite[];
  readonly error: string | null;
};

export type UsePrerequisites = PrerequisitesState & {
  readonly addCondition: (description: string) => void;
  readonly addDependency: (dependsOnItemId: string) => void;
  readonly setMet: (prerequisiteId: string, isMet: boolean) => void;
  readonly remove: (prerequisiteId: string) => void;
};

/**
 * The conditions a waiting item depends on.
 * `onChange` runs after every change, because the database may release the item.
 */
export function usePrerequisites(itemId: string, onChange: () => void): UsePrerequisites {
  const [state, setState] = useState<PrerequisitesState>({ prerequisites: [], error: null });

  const load = useCallback(async (): Promise<void> => {
    try {
      const prerequisites = await listPrerequisites(itemId);
      setState({ prerequisites, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, error: toMessage(error) }));
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    (change: () => Promise<void>): void => {
      change()
        .then(load)
        .then(onChange)
        .catch((error: unknown) => {
          setState((previous) => ({ ...previous, error: toMessage(error) }));
        });
    },
    [load, onChange],
  );

  return {
    ...state,
    addCondition: (description): void => {
      run(() => addCondition(itemId, description));
    },
    addDependency: (dependsOnItemId): void => {
      run(() => addDependency(itemId, dependsOnItemId));
    },
    setMet: (prerequisiteId, isMet): void => {
      run(() => setConditionMet(prerequisiteId, isMet));
    },
    remove: (prerequisiteId): void => {
      run(() => removePrerequisite(prerequisiteId));
    },
  };
}
