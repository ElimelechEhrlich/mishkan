import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { SmartCheckStep } from '../../hooks/useStaples';
import { Icon } from '../ui/Icon';

type SmartCheckLogProps = {
  /** What the check said so far, in order. */
  readonly steps: readonly SmartCheckStep[];
  readonly checking: boolean;
};

const said = labels.staples.smartSteps;

/** A step in plain words; null for the names, shown apart as they come. */
function stepText(step: SmartCheckStep): string | null {
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
    case 'generic':
      return null;
  }
}

/**
 * What the smart check does, live, as the server tells it: reading the list, what the family
 * already decided, asking the model, each name and the product it is as the model writes it,
 * and how the names were grouped.
 */
export function SmartCheckLog({ steps, checking }: SmartCheckLogProps): ReactElement {
  const namesEnd = useRef<HTMLLIElement>(null);
  const generics = steps.flatMap((step) => (step.kind === 'generic' ? [step] : []));
  const asked = steps.find((step) => step.kind === 'asking');
  const total = asked?.kind === 'asking' ? asked.count : 0;
  const before = steps.filter((step) => step.kind !== 'generic' && step.kind !== 'grouped');
  const after = steps.filter((step) => step.kind === 'grouped');

  // The newest name in sight as they come.
  useEffect(() => {
    namesEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [generics.length]);

  function line(text: string, key: string, last: boolean): ReactElement {
    const running = last && checking;
    return (
      <li key={key} className="flex items-start gap-2 text-[13px]">
        <span
          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${running ? 'animate-pulse bg-gold' : 'bg-primary'}`}
        />
        <span className={running ? 'text-ink' : 'text-muted'}>{text}</span>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-paper p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <Icon name="chat" className="size-3.5" />
        {said.title}
      </p>
      <ul className="flex flex-col gap-1">
        {before.map((step, index) =>
          line(
            stepText(step) ?? '',
            `step-${String(index)}`,
            generics.length === 0 && after.length === 0 && index === before.length - 1,
          ),
        )}
      </ul>
      {generics.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-gold transition-[width] duration-300"
                style={{
                  width: `${String(total === 0 ? 100 : Math.min(100, (generics.length / total) * 100))}%`,
                }}
              />
            </span>
            <span className="text-xs text-muted tabular-nums">
              {said.answered(generics.length, total)}
            </span>
          </div>
          <ul className="flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-lg bg-surface px-2.5 py-1.5">
            {generics.map((step, index) => (
              <li
                key={`${step.name}-${String(index)}`}
                ref={index === generics.length - 1 ? namesEnd : undefined}
                className="flex animate-fade-in items-center gap-1.5 text-[13px]"
              >
                <span>{step.name}</span>
                {step.generic.trim() === step.name.trim() ? (
                  <span className="text-xs text-faint">{said.same}</span>
                ) : (
                  <>
                    <Icon name="back" className="size-3 shrink-0 text-faint" />
                    <span className="font-medium text-primary">{step.generic}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {after.length > 0 && (
        <ul className="flex flex-col gap-1">
          {after.map((step, index) => line(stepText(step) ?? '', `after-${String(index)}`, false))}
        </ul>
      )}
    </div>
  );
}
