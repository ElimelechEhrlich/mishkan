import type { ReactElement } from 'react';
import { OnboardingForm } from '../components/onboarding/OnboardingForm';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSessionContext } from '../hooks/useRouteContext';

export function OnboardingPage(): ReactElement {
  const { signOut } = useSessionContext();
  const { busy, error, create, join } = useOnboarding();

  return (
    <OnboardingForm busy={busy} error={error} onCreate={create} onJoin={join} onSignOut={signOut} />
  );
}
