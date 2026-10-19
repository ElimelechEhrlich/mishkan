import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { FocusRow } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';

type FocusLineProps = {
  readonly row: FocusRow;
  /** Its hour, or the day it was due. */
  readonly meta: string | null;
  readonly alert: boolean;
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
};

/** One short line of the first page: tick it off, or tap it to open it. */
export function FocusLine({ row, meta, alert, lookups, onComplete }: FocusLineProps): ReactElement {
  const { item } = row;
  const [ticked, setTicked] = useState(false);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  const container = item.kind === 'goal' || item.kind === 'issue';
  return (
    <li
      className={`flex min-h-12 items-center gap-3 transition-opacity duration-300 ${ticked ? 'opacity-40' : ''}`}
    >
      {container ? (
        <Icon
          name={item.kind === 'goal' ? 'target' : 'alert'}
          className={`size-5.5 shrink-0 ${tone?.text ?? 'text-muted'}`}
        />
      ) : (
        <CheckButton
          checked={ticked}
          label={labels.actions.markDone}
          toneClass={tone?.border}
          onClick={() => {
            if (!ticked) {
              setTicked(true);
              onComplete(item);
            }
          }}
        />
      )}
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 items-baseline gap-2 py-2 active:opacity-60"
      >
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
          <span
            className={`shrink-0 text-[13px] tabular-nums ${alert ? 'text-alert' : 'text-primary'}`}
          >
            {meta}
          </span>
        )}
      </Link>
    </li>
  );
}
