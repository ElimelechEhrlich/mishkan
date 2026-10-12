import { everythingReach, scopeOptions } from '../lib/lookups';
import { everythingFlight, flyWhile } from '../lib/flight';
import type { EntityWithDomains } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

/**
 * Going straight back to everything, offered once "everything" has moved from the entity
 * carousel up to the header; undefined while it is in the carousel.
 */
export function useEverythingShortcut(
  entities: readonly EntityWithDomains[],
): (() => void) | undefined {
  const { scopeId, setScope, everythingUp } = useHouseholdContext();
  const index = scopeOptions(entities).indexOf(scopeId);
  // While the carousel turns, "everything" goes up and down with it, not with the choice.
  if (!(everythingUp ?? index > everythingReach)) {
    return undefined;
  }
  return (): void => {
    flyWhile(everythingFlight, () => {
      setScope(null);
    });
  };
}
