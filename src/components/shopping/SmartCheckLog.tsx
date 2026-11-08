import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { SmartCheckStep } from '../../hooks/useStaples';
import { Icon } from '../ui/Icon';

type SmartCheckLogProps = {
  /** What the check said so far, in order; the last is shown. */
  readonly steps: readonly SmartCheckStep[];
};

const said = labels.staples.smartSteps;

/** A step other than a name, in plain words. */
function stepText(step: Exclude<SmartCheckStep, { kind: 'generic' }>): string {
  switch (step.kind) {
    case 'read':
      return said.read(step.count);
    case 'known':
      return said.known(step.merged, step.apart);
    case 'asking':
      return said.asking(step.count);
    case 'busy':
      return said.busy(step.attempt);
    case 'fallback':
      return said.fallback;
    case 'quota':
      return said.quota;
    case 'grouped':
      return said.grouped(step.products, step.groups);
  }
}

/**
 * What the smart check is doing now, live, as the server tells it: one line, replaced by the
 * next. While the model writes, the line is the name it reached and the product it is.
 */
export function SmartCheckLog({ steps }: SmartCheckLogProps): ReactElement {
  const step = steps.at(-1);
  const asked = steps.find((each) => each.kind === 'asking');
  const total = asked?.kind === 'asking' ? asked.count : 0;
  const done = steps.filter((each) => each.kind === 'generic').length;

  return (
    <p
      key={steps.length}
      aria-live="polite"
      className="flex min-h-6 animate-fade-in items-center gap-2 text-[13px] text-muted"
    >
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-gold" />
      {step === undefined ? (
        <span>{labels.staples.smartChecking}</span>
      ) : step.kind === 'generic' ? (
        <>
          <span className="text-xs text-faint tabular-nums">{said.counted(done, total)}</span>
          <span className="truncate text-ink">{step.name}</span>
          {step.generic.trim() !== step.name.trim() && (
            <>
              <Icon name="back" className="size-3 shrink-0 text-faint" />
              <span className="truncate font-medium text-primary">{step.generic}</span>
            </>
          )}
        </>
      ) : (
        <span>{stepText(step)}</span>
      )}
    </p>
  );
}
