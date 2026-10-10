import { useOutletContext } from 'react-router';
import type { HouseholdContext, SessionContext } from '../types/domain';

/** For routes rendered inside RequireAuth. */
export function useSessionContext(): SessionContext {
  return useOutletContext<SessionContext>();
}

/** For routes rendered inside RequireHousehold. */
export function useHouseholdContext(): HouseholdContext {
  return useOutletContext<HouseholdContext>();
}
