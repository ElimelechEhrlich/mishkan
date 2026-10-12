import { everythingReach, scopeOptions } from '../lib/lookups';
import { everythingFlight, flyWhile } from '../lib/flight';
import type { EntityWithDomains } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

export type EverythingShortcut = {
  /** Whether the chosen entity is past "everything", so that it waits in the header. */
  readonly away: boolean;
  /** Goes straight back to everything. */
  readonly go: () => void;
};

/**
 * Going straight back to everything from the header, where "everything" waits once the
 * carousel has moved past it. While the carousel turns, the header button itself follows
 * the turn (see useEverythingUp), so the page is not redrawn for it.
 */
export function useEverythingShortcut(entities: readonly EntityWithDomains[]): EverythingShortcut {
  const { scopeId, setScope } = useHouseholdContext();
  return {
    away: scopeOptions(entities).indexOf(scopeId) > everythingReach,
    go: (): void => {
      flyWhile(everythingFlight, () => {
        setScope(null);
      });
    },
  };
}
