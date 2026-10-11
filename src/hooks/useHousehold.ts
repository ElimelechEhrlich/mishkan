import { useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { getHousehold, getMemberByUserId, listMembers } from '../services/householdService';
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

export function useHousehold(userId: string): HouseholdState {
  const [state, setState] = useState<HouseholdState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    loadHousehold(userId)
      .then((data) => {
        if (active) {
          setState({ data, loading: false, error: null });
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
