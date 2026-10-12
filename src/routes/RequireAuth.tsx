import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { SplashScreen } from '../components/ui/SplashScreen';
import { StatusScreen } from '../components/ui/StatusScreen';
import { useSession } from '../hooks/useSession';
import type { SessionContext } from '../types/domain';

/** Lets signed-in users through; everyone else goes to the login page. */
export function RequireAuth(): ReactElement {
  const { session, loading, error, signOut } = useSession();
  const location = useLocation();

  if (loading) {
    return <SplashScreen />;
  }
  if (error !== null) {
    return <StatusScreen text={error} isError />;
  }
  if (session === null) {
    // The query string is kept so an invite link survives the login step.
    return <Navigate to={`/login${location.search}`} replace />;
  }

  const context: SessionContext = {
    userId: session.user.id,
    email: session.user.email ?? null,
    signOut,
  };
  return <Outlet context={context} />;
}
