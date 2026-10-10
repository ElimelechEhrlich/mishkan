import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router';
import { StatusScreen } from '../components/ui/StatusScreen';
import { labels } from '../constants/labels';
import { useSession } from '../hooks/useSession';
import type { SessionContext } from '../types/domain';

/** Lets signed-in users through; everyone else goes to the login page. */
export function RequireAuth(): ReactElement {
  const { session, loading, error, signOut } = useSession();

  if (loading) {
    return <StatusScreen text={labels.status.loading} />;
  }
  if (error !== null) {
    return <StatusScreen text={error} isError />;
  }
  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  const context: SessionContext = { userId: session.user.id, signOut };
  return <Outlet context={context} />;
}
