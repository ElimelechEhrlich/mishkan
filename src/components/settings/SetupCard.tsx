import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { openSteps } from '../../lib/setup';
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
  readonly onBringBack: (step: SetupStep) => void;
  /** At the head of the settings it folds once nothing is left; in the tour it stays open. */
  readonly foldable?: boolean;
};

/**
 * "Getting started": the first steps, each done, put aside, or with a button to do it. It stays
 * in its place: once nothing is left it folds to one line, and opening it shows every step, so
 * one put aside can be brought back and the tour seen again.
 */
export function SetupCard({
  steps,
  pushBlocked,
  busy,
  onAct,
  onSetAside,
  onBringBack,
  foldable = true,
}: SetupCardProps): ReactElement | null {
  const left = openSteps(steps).length;
  const [open, setOpen] = useState(left > 0);
  if (steps.length === 0) {
    return null;
  }
  const shown = !foldable || open;

  return (
    <section className="flex flex-col gap-1.5">
      {foldable ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          className="flex items-center gap-2 px-1 text-start"
        >
          <span className="text-xs font-bold tracking-wide text-muted">{labels.setup.title}</span>
          <span className={`text-xs ${left > 0 ? 'font-semibold text-alert' : 'text-primary'}`}>
            {left > 0 ? labels.setup.left(left) : labels.setup.allSet}
          </span>
          <Icon
            name="down"
            className={`ms-auto size-4 text-faint transition ${open ? 'rotate-180' : ''}`}
          />
        </button>
      ) : (
        <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.setup.title}</h2>
      )}
      {shown && (
        <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
          {steps.map(({ step, done, setAside }) => (
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
                <span
                  className={`text-[15px] font-medium ${done || setAside ? 'text-muted' : 'text-ink'}`}
                >
                  {labels.setup.steps[step]}
                </span>
                {setAside && <span className="text-xs text-muted">{labels.setup.notRelevant}</span>}
                {!done && !setAside && step === 'notifications' && pushBlocked && (
                  <span className="text-xs text-alert">{labels.setup.blocked}</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {setAside ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onBringBack(step);
                    }}
                  >
                    {labels.setup.bringBack}
                  </Button>
                ) : done ? (
                  step === 'tour' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onAct(step);
                      }}
                    >
                      {labels.setup.again}
                    </Button>
                  )
                ) : (
                  <>
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
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
