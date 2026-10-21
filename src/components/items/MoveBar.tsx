import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { MoveTarget } from '../../lib/todayBrief';

type MoveBarProps = {
  readonly target: MoveTarget;
  /** How many are chosen, and how many could be. */
  readonly count: number;
  readonly total: number;
  readonly busy: boolean;
  readonly onAll: (all: boolean) => void;
  readonly onCancel: () => void;
  readonly onMove: () => void;
};

/** The foot of a list while choosing what to move: all or none, cancel, and move. */
export function MoveBar({
  target,
  count,
  total,
  busy,
  onAll,
  onCancel,
  onMove,
}: MoveBarProps): ReactElement {
  const all = count === total && total > 0;
  return (
    <div className="flex items-center gap-1.5 border-t border-line py-1.5">
      <button
        type="button"
        onClick={() => {
          onAll(!all);
        }}
        className="min-h-9 rounded-full px-2 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
      >
        {all ? labels.move.none : labels.move.all}
      </button>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onCancel}
        className="min-h-9 rounded-full px-3 text-[13px] font-medium text-muted transition active:scale-[0.97]"
      >
        {labels.move.cancel}
      </button>
      <button
        type="button"
        disabled={count === 0 || busy}
        onClick={onMove}
        className="min-h-9 rounded-full bg-primary px-4 text-[13px] font-semibold text-white transition active:scale-[0.97] disabled:bg-line disabled:text-faint"
      >
        {labels.move.confirm(count, target)}
      </button>
    </div>
  );
}
