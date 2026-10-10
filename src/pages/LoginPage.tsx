import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { LoginForm } from '../components/auth/LoginForm';
import { StatusScreen } from '../components/ui/StatusScreen';
import { labels } from '../constants/labels';
import { useSession } from '../hooks/useSession';

export function LoginPage(): ReactElement {
  const { session, loading, busy, error, signIn } = useSession();

  if (loading) {
    return <StatusScreen text={labels.status.loading} />;
  }
  if (session !== null) {
    return <Navigate to="/" replace />;
  }
  return <LoginForm busy={busy} error={error} onSubmit={signIn} />;
}
