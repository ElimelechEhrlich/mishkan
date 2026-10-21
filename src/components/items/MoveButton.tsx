import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { MoveTarget } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type MoveButtonProps = {
  readonly target: MoveTarget;
  readonly onClick: () => void;
};

/** At the foot of a list: starts choosing items of it to move. */
export function MoveButton({ target, onClick }: MoveButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
    >
      <Icon name={target === 'urgent' ? 'alert' : 'calendar'} className="size-3.5" />
      {labels.move.start[target]}
    </button>
  );
}
