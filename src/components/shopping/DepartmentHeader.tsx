import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';

type DepartmentHeaderProps = {
  readonly name: string;
  readonly bought: number;
  readonly total: number;
  readonly folded: boolean;
  readonly onToggle: () => void;
};

/**
 * The thin line above a department's items in a run: its name and how much of it was bought.
 * Once all of it is bought it is marked, and folds out of the way.
 */
export function DepartmentHeader({
  name,
  bought,
  total,
  folded,
  onToggle,
}: DepartmentHeaderProps): ReactElement {
  const done = bought === total;
  return (
    <li className="border-t border-line first:border-t-0">
      <button
        type="button"
        aria-expanded={!folded}
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-3.5 py-1.5 text-start ${
          done ? 'bg-primary-soft/60' : 'bg-paper'
        }`}
      >
        {done && <Icon name="check" className="size-3.5 text-primary" />}
        <span className={`text-xs font-bold ${done ? 'text-primary' : 'text-muted'}`}>{name}</span>
        <span className="text-[11px] text-faint">
          {labels.departments.groupCount(bought, total)}
        </span>
        <Icon
          name="down"
          className={`ms-auto size-3.5 text-faint transition ${folded ? '' : 'rotate-180'}`}
        />
      </button>
    </li>
  );
}
