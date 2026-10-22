import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { MoveTarget } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type MoveButtonProps = {
  readonly target: MoveTarget;
  readonly onClick: () => void;
  /** Without its sign, where two stand side by side. */
  readonly compact?: boolean;
};

/** At the foot of a list: starts choosing items of it to move. */
export function MoveButton({ target, onClick, compact = false }: MoveButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-soft text-[13px] font-semibold whitespace-nowrap text-primary transition active:scale-[0.97] ${
        compact ? 'px-2.5' : 'px-3'
      }`}
    >
      {!compact && <Icon name={target === 'urgent' ? 'alert' : 'calendar'} className="size-3.5" />}
      {labels.move.start[target]}
    </button>
  );
}
