import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { cachedEntities } from '../../hooks/useEntities';
import { useSetupSteps } from '../../hooks/useSetupSteps';
import { SetupCard } from '../settings/SetupCard';

type TourSetupProps = {
  readonly memberId: string;
  /** How many parents the home has. */
  readonly parents: number;
  /** Closes the tour, before going to where a step is done. */
  readonly onClose: () => void;
};

/**
 * The tour's last page: the first steps to do, each a button. What is left stays at the head
 * of the settings.
 */
export function TourSetup({ memberId, parents, onClose }: TourSetupProps): ReactElement | null {
  const setup = useSetupSteps(cachedEntities(memberId), parents);
  const navigate = useNavigate();
  const steps = setup.steps.filter((entry) => entry.step !== 'tour');

  return (
    <div className="w-full text-start">
      <SetupCard
        steps={steps}
        pushBlocked={setup.push.status === 'blocked'}
        busy={setup.push.busy}
        onSetAside={setup.setAside}
        onAct={(step) => {
          if (step === 'notifications') {
            setup.push.enable();
            return;
          }
          onClose();
          void navigate(step === 'invite' ? '/settings#setup-invite' : '/settings#setup-children');
        }}
      />
    </div>
  );
}
