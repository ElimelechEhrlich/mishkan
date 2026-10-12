import { carouselReach, scopeOptions } from '../lib/lookups';
import type { EntityWithDomains } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

/**
 * Going straight back to everything, offered once "everything" is out of sight in the
 * entity carousel; undefined while it can still be tapped there.
 */
export function useEverythingShortcut(
  entities: readonly EntityWithDomains[],
): (() => void) | undefined {
  const { scopeId, setScope } = useHouseholdContext();
  const index = scopeOptions(entities).indexOf(scopeId);
  if (index <= carouselReach) {
    return undefined;
  }
  return (): void => {
    setScope(null);
  };
}
