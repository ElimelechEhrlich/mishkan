import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { formatDueDate } from '../../lib/itemRules';
import { noteValue } from '../../lib/itemText';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CopyButton } from '../ui/CopyButton';
import { Icon } from '../ui/Icon';
import { CalendarBadge } from './CalendarBadge';

type SearchItemRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
};

/** An item found by a search: its title, kind, domain and date; done ones crossed out. */
export function SearchItemRow({ item, lookups }: SearchItemRowProps): ReactElement {
  const done = item.status !== 'open';
  const value = noteValue(item);
  const domainLabel =
    item.domain_id === null ? labels.nav.incomplete : lookups.domainLabels.get(item.domain_id);
  const details = [
    domainLabel,
    item.due_date === null ? undefined : formatDueDate(item.due_date),
    done ? labels.status.done : undefined,
  ].filter((part) => part !== undefined);

  return (
    <li className="group">
      <Link to={`/item/${item.id}`} className="flex items-center gap-3 ps-3.5 active:bg-paper">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-t border-line py-3 pe-3.5 group-first:border-t-0">
          <span className={`text-[15px] break-words ${done ? 'text-muted line-through' : ''}`}>
            {item.title}
          </span>
          {value !== null && (
            <span className="self-start text-[15px] font-semibold break-words" dir="auto">
              {value}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {item.kind !== 'task' && (
              <span className="rounded-[5px] bg-line/70 px-1.5 text-[11px] font-semibold">
                {labels.kind[item.kind]}
              </span>
            )}
            <CalendarBadge itemId={item.id} />
            {details.join(labels.item.separator)}
          </span>
        </span>
        {value === null ? (
          <Icon name="forward" className="me-3.5 size-4 text-faint" />
        ) : (
          <span className="me-3.5">
            <CopyButton text={value} />
          </span>
        )}
      </Link>
    </li>
  );
}
