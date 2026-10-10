import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  addChild,
  getHousehold,
  getMemberByUserId,
  listMembers,
  removeChild,
} from '../services/householdService';
import type { Household, Member } from '../types/domain';

type HouseholdData = {
  readonly member: Member;
  readonly household: Household;
  readonly members: readonly Member[];
};

type HouseholdState = {
  /** null while loading, and when the signed-in user has not joined a household yet. */
  readonly data: HouseholdData | null;
  readonly loading: boolean;
  readonly error: string | null;
};

type UseHousehold = HouseholdState & {
  readonly addChild: (name: string) => Promise<boolean>;
  readonly removeChild: (memberId: string) => void;
};

async function loadHousehold(userId: string): Promise<HouseholdData | null> {
  const member = await getMemberByUserId(userId);
  if (member === null) {
    return null;
  }
  const [household, members] = await Promise.all([
    getHousehold(member.household_id),
    listMembers(),
  ]);
  return { member, household, members };
}

export function useHousehold(userId: string): UseHousehold {
  const [state, setState] = useState<HouseholdState>({ data: null, loading: true, error: null });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const data = await loadHousehold(userId);
      setState({ data, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const householdId = state.data?.household.id ?? null;

  const handleAddChild = useCallback(
    async (name: string): Promise<boolean> => {
      if (householdId === null) {
        return false;
      }
      try {
        await addChild(householdId, name);
        await reload();
        return true;
      } catch (error: unknown) {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
        return false;
      }
    },
    [householdId, reload],
  );

  const handleRemoveChild = useCallback(
    (memberId: string): void => {
      removeChild(memberId)
        .then(reload)
        .catch((error: unknown) => {
          setState((previous) => ({ ...previous, error: toMessage(error) }));
        });
    },
    [reload],
  );

  return { ...state, addChild: handleAddChild, removeChild: handleRemoveChild };
}
