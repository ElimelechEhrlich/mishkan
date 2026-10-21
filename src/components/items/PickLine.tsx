import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { FocusRow } from '../../lib/todayBrief';
import { Icon } from '../ui/Icon';

type PickLineProps = {
  readonly row: FocusRow;
  readonly meta: string | null;
  readonly picked: boolean;
  /** Absent for what cannot be moved from here, shown faint. */
  readonly onToggle?: (() => void) | undefined;
};

/** One line while choosing what to move: a box to tick, the whole line a tap. */
export function PickLine({ row, meta, picked, onToggle }: PickLineProps): ReactElement {
  const { item } = row;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={picked}
        disabled={onToggle === undefined}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 py-1.5 text-start transition active:opacity-60 disabled:opacity-35"
      >
        <span
          className={`flex size-5.5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            picked ? 'border-primary bg-primary text-white' : 'border-faint'
          }`}
        >
          {picked && <Icon name="check" className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {item.title}
          {row.parentTitle !== null && (
            <span className="text-[13px] text-muted">
              {labels.item.separator}
              {row.parentTitle}
            </span>
          )}
        </span>
        {meta !== null && (
          <span className="shrink-0 text-[13px] text-muted tabular-nums">{meta}</span>
        )}
      </button>
    </li>
  );
}
