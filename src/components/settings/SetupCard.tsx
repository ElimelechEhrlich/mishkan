import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { SetupState, SetupStep } from '../../lib/setup';
import { apkPath } from '../../lib/install';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

type SetupCardProps = {
  readonly steps: readonly SetupState[];
  /** Notifications blocked in the phone's settings: the button can not turn them on. */
  readonly pushBlocked: boolean;
  readonly busy: boolean;
  /** Does the step: opens the tour, or the place in the settings where it is done. */
  readonly onAct: (step: SetupStep) => void;
  readonly onSetAside: (step: SetupStep) => void;
};

/**
 * "Getting started": the first steps, each done or with a button to do it, and "not relevant"
 * to put it aside for good. Gone once there is nothing left to do.
 */
export function SetupCard({
  steps,
  pushBlocked,
  busy,
  onAct,
  onSetAside,
}: SetupCardProps): ReactElement | null {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.setup.title}</h2>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {steps.map(({ step, done }) => (
          <li
            key={step}
            className="flex items-center gap-3 border-t border-line px-3.5 py-3 first:border-t-0"
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-primary text-white' : 'border-2 border-line'
              }`}
            >
              {done && <Icon name="check" className="size-4" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`text-[15px] font-medium ${done ? 'text-muted' : 'text-ink'}`}>
                {labels.setup.steps[step]}
              </span>
              {!done && step === 'notifications' && pushBlocked && (
                <span className="text-xs text-alert">{labels.setup.blocked}</span>
              )}
            </span>
            {!done && (
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onSetAside(step);
                  }}
                  className="min-h-9 px-1.5 text-[12px] text-muted"
                >
                  {labels.setup.notRelevant}
                </button>
                {step === 'install' ? (
                  <a
                    href={apkPath}
                    download="mishkan.apk"
                    className="flex min-h-9 items-center rounded-xl bg-primary-soft px-3 text-[14px] font-semibold text-primary"
                  >
                    {labels.setup.actions.install}
                  </a>
                ) : (
                  <Button
                    variant="soft"
                    disabled={(step === 'notifications' && pushBlocked) || busy}
                    onClick={() => {
                      onAct(step);
                    }}
                  >
                    {labels.setup.actions[step]}
                  </Button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
