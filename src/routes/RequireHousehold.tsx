import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router';
import { WelcomeTour } from '../components/onboarding/WelcomeTour';
import { SplashScreen } from '../components/ui/SplashScreen';
import { StatusScreen } from '../components/ui/StatusScreen';
import { useHousehold } from '../hooks/useHousehold';
import { useScopeState } from '../hooks/useScopeState';
import { useSessionContext } from '../hooks/useRouteContext';
import { useWelcomeTour } from '../hooks/useWelcomeTour';
import type { HouseholdContext } from '../types/domain';

/** Lets parents who belong to a household through; the rest go to onboarding. */
export function RequireHousehold(): ReactElement {
  const session = useSessionContext();
  const { data, loading, error } = useHousehold(session.userId);
  const scope = useScopeState();
  const tour = useWelcomeTour();

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
