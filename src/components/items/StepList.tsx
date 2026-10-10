import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { CheckButton } from '../ui/CheckButton';

type StepListProps = {
  /** The steps of one goal or issue, done ones included. */
  readonly steps: readonly Item[];
  readonly onComplete: (step: Item) => void;
  readonly onReopen: (stepId: string) => void;
  readonly onAdd: (title: string) => void;
};

export function StepList({ steps, onComplete, onReopen, onAdd }: StepListProps): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 && <p className="text-sm text-muted">{labels.goals.noSteps}</p>}
      <ul className="flex flex-col gap-2">
        {steps.map((step) => {
          const done = step.status === 'done';
          return (
            <li key={step.id} className="flex items-center gap-3">
              <CheckButton
                checked={done}
                label={done ? labels.actions.markOpen : labels.actions.markDone}
                onClick={() => {
                  if (done) {
                    onReopen(step.id);
                  } else {
                    onComplete(step);
                  }
                }}
              />
              <Link
                to={`/item/${step.id}`}
                className={`min-w-0 flex-1 break-words ${done ? 'text-muted line-through' : ''}`}
              >
                {step.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <AddRow label={labels.fields.newStep} onAdd={onAdd} />
    </div>
  );
}
