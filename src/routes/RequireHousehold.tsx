import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router';
import { WelcomeTour } from '../components/onboarding/WelcomeTour';
import { SplashScreen } from '../components/ui/SplashScreen';
import { StatusScreen } from '../components/ui/StatusScreen';
import { useHousehold } from '../hooks/useHousehold';
import { useKeepPushSubscription } from '../hooks/useKeepPushSubscription';
import { useScopeState } from '../hooks/useScopeState';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { useSessionContext } from '../hooks/useRouteContext';
import { useWelcomeTour } from '../hooks/useWelcomeTour';
import type { HouseholdContext } from '../types/domain';

/** Lets parents who belong to a household through; the rest go to onboarding. */
export function RequireHousehold(): ReactElement {
  const session = useSessionContext();
  const { data, loading, error } = useHousehold(session.userId);
  const scope = useScopeState();
  const tour = useWelcomeTour();
  useKeepPushSubscription(data?.member.id ?? null);
  useScrollMemory();

  if (loading) {
    return <SplashScreen />;
  }
  if (data === null) {
    if (error !== null) {
      return <StatusScreen text={error} isError />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  const context: HouseholdContext = { ...session, ...data, ...scope };
  return (
    <>
      <Outlet context={context} />
      {tour.open && <WelcomeTour onClose={tour.close} />}
    </>
  );
}
