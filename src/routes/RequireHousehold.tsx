import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router';
import { StatusScreen } from '../components/ui/StatusScreen';
import { labels } from '../constants/labels';
import { useHousehold } from '../hooks/useHousehold';
import { useScopeState } from '../hooks/useScopeState';
import { useSessionContext } from '../hooks/useRouteContext';
import type { HouseholdContext } from '../types/domain';

/** Lets parents who belong to a household through; the rest go to onboarding. */
export function RequireHousehold(): ReactElement {
  const session = useSessionContext();
  const { data, loading, error } = useHousehold(session.userId);
  const scope = useScopeState();

  if (loading) {
    return <StatusScreen text={labels.status.loading} />;
  }
  if (data === null) {
    if (error !== null) {
      return <StatusScreen text={error} isError />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  const context: HouseholdContext = { ...session, ...data, ...scope };
  return <Outlet context={context} />;
}
