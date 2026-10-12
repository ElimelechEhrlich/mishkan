import { everythingReach, scopeOptions } from '../lib/lookups';
import { withViewTransition } from '../lib/viewTransition';
import type { EntityWithDomains } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

/**
 * Going straight back to everything, offered once "everything" has moved from the entity
 * carousel up to the header; undefined while it is in the carousel.
 */
export function useEverythingShortcut(
  entities: readonly EntityWithDomains[],
): (() => void) | undefined {
  const { scopeId, setScope } = useHouseholdContext();
  const index = scopeOptions(entities).indexOf(scopeId);
  if (index <= everythingReach) {
    return undefined;
  }
  return (): void => {
    withViewTransition(() => {
      setScope(null);
    });
  };
}
