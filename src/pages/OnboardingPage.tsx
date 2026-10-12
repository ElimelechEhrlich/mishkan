import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { OnboardingForm } from '../components/onboarding/OnboardingForm';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSessionContext } from '../hooks/useRouteContext';

export function OnboardingPage(): ReactElement {
  const { signOut, email } = useSessionContext();
  const [searchParams] = useSearchParams();
  const onboarding = useOnboarding(searchParams.get('code'));

  return (
    <OnboardingForm
      busy={onboarding.busy}
      error={onboarding.error}
      inviteCode={onboarding.inviteCode}
      onInviteCodeChange={onboarding.setInviteCode}
      unclaimedParents={onboarding.unclaimedParents}
      onCreate={onboarding.create}
      onJoin={onboarding.join}
      email={email}
      onSignOut={signOut}
    />
  );
}
