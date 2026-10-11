import { useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { hasRowLists, hasRows, readCache, writeCache } from '../lib/cache';
import { getOwnHousehold, listMembers } from '../services/householdService';
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

function isHouseholdData(value: unknown): value is HouseholdData {
  return hasRows(value, ['member', 'household']) && hasRowLists(value, ['members']);
}

/** Both asked at once: the household and its members, the signed-in parent among them. */
async function loadHousehold(userId: string): Promise<HouseholdData | null> {
  const [household, members] = await Promise.all([getOwnHousehold(), listMembers()]);
  const member = members.find((candidate) => candidate.user_id === userId);
  if (household === null || member === undefined) {
    return null;
  }
  return { member, household, members };
}

export function useHousehold(userId: string): HouseholdState {
  // What was loaded last time shows at once; the fresh copy replaces it when it arrives.
  const [state, setState] = useState<HouseholdState>(() => {
    const cached = readCache(`household.${userId}`, isHouseholdData);
    return { data: cached, loading: cached === null, error: null };
  });

  useEffect(() => {
    let active = true;
    loadHousehold(userId)
      .then((data) => {
        if (active) {
          setState({ data, loading: false, error: null });
        }
        if (data !== null) {
          writeCache(`household.${userId}`, data);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
        }
      });
    return (): void => {
      active = false;
    };
  }, [userId]);

  return state;
}
