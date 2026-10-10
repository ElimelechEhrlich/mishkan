import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { toMessage } from '../lib/errors';
import { createHousehold, joinHousehold } from '../services/householdService';

type OnboardingState = {
  readonly busy: boolean;
  readonly error: string | null;
};

type UseOnboarding = OnboardingState & {
  readonly create: (householdName: string, parentName: string) => void;
  readonly join: (inviteCode: string, parentName: string) => void;
};

export function useOnboarding(): UseOnboarding {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({ busy: false, error: null });

  const run = useCallback(
    (action: () => Promise<void>): void => {
      setState({ busy: true, error: null });
      action()
        .then(() => {
          void navigate('/', { replace: true });
        })
        .catch((error: unknown) => {
          setState({ busy: false, error: toMessage(error) });
        });
    },
    [navigate],
  );

  const create = useCallback(
    (householdName: string, parentName: string): void => {
      run(() => createHousehold(householdName, parentName));
    },
    [run],
  );

  const join = useCallback(
    (inviteCode: string, parentName: string): void => {
      run(() => joinHousehold(inviteCode, parentName));
    },
    [run],
  );

  return { ...state, create, join };
}
