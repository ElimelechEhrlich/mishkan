import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { OnboardingForm } from '../components/onboarding/OnboardingForm';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSessionContext } from '../hooks/useRouteContext';

export function OnboardingPage(): ReactElement {
  const { signOut } = useSessionContext();
  const { busy, error, create, join } = useOnboarding();
  const [searchParams] = useSearchParams();

  return (
    <OnboardingForm
      busy={busy}
      error={error}
      initialInviteCode={searchParams.get('code')}
      onCreate={create}
      onJoin={join}
      onSignOut={signOut}
    />
  );
}
