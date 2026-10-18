import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

/** One line of "waiting on you": what it is, a word on why, and where a tap leads. */
export function WaitingRow({
  to,
  icon,
  title,
  note,
}: {
  readonly to: string;
  readonly icon: IconName;
  readonly title: string;
  readonly note?: string | undefined;
}): ReactElement {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-12 items-center gap-3 py-1.5 transition active:scale-[0.99]"
      >
        <Icon name={icon} className="size-5 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-medium">{title}</span>
          {note !== undefined && <span className="truncate text-[13px] text-muted">{note}</span>}
        </span>
        <Icon name="forward" className="size-4 shrink-0 text-faint" />
      </Link>
    </li>
  );
}
