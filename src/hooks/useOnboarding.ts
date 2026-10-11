import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toMessage } from '../lib/errors';
import {
  createHousehold,
  joinHousehold,
  listUnclaimedParents,
} from '../services/householdService';
import type { UnclaimedParent } from '../types/domain';

type OnboardingState = {
  readonly busy: boolean;
  readonly error: string | null;
};

type UseOnboarding = OnboardingState & {
  /** The code typed in the join form. */
  readonly inviteCode: string;
  readonly setInviteCode: (inviteCode: string) => void;
  /** Parent entities waiting for a parent to join, for the typed invite code. */
  readonly unclaimedParents: readonly UnclaimedParent[];
  readonly create: (householdName: string, parentName: string) => void;
  readonly join: (parentName: string, parentEntityId: string | null) => void;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `initialInviteCode` comes from an invite link and opens the form ready to join. */
export function useOnboarding(initialInviteCode: string | null): UseOnboarding {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({ busy: false, error: null });
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const [unclaimed, setUnclaimed] = useState<{
    readonly code: string;
    readonly parents: readonly UnclaimedParent[];
  }>({ code: '', parents: [] });

  const code = inviteCode.trim();
  const isValidCode = uuidPattern.test(code);

  useEffect(() => {
    if (!isValidCode) {
      return;
    }
    let active = true;
    listUnclaimedParents(code)
      .then((parents) => {
        if (active) {
          setUnclaimed({ code, parents });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState((previous) => ({ ...previous, error: toMessage(error) }));
        }
      });
    return (): void => {
      active = false;
    };
  }, [code, isValidCode]);

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
    (parentName: string, parentEntityId: string | null): void => {
      run(() => joinHousehold(code, parentName, parentEntityId));
    },
    [run, code],
  );

  return {
    ...state,
    inviteCode,
    setInviteCode,
    unclaimedParents: unclaimed.code === code ? unclaimed.parents : [],
    create,
    join,
  };
}
