import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { formatTimestampDate } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';

type DoneRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly onReopen: (itemId: string) => void;
};

/** A closed item: when it was done and by whom. Unticking brings it back. */
export function DoneRow({ item, lookups, onReopen }: DoneRowProps): ReactElement {
  const domainLabel =
    item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const doneBy =
    item.completed_by === null ? undefined : lookups.memberNames.get(item.completed_by);
  const doneOn = item.completed_at === null ? undefined : formatTimestampDate(item.completed_at);
  const details = [domainLabel, doneBy, doneOn].filter((part) => part !== undefined);
  const repeated = item.kind === 'task' && item.time_mode === 'recurring';

  return (
    <li className="group flex gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 pt-3">
        {/* A recurring task is still open; this row is one time it was done. */}
        {repeated ? (
          <Icon name="repeat" className="size-5.5 text-faint" />
        ) : (
          <CheckButton
            checked
            label={labels.actions.markOpen}
            onClick={() => {
              onReopen(item.id);
            }}
          />
        )}
      </span>
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5 border-t border-line py-3 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span className="text-[15px] break-words text-muted line-through">{item.title}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {item.kind !== 'task' && (
            <span className="rounded-[5px] bg-line/70 px-1.5 text-[11px] font-semibold">
              {labels.kind[item.kind]}
            </span>
          )}
          {details.join(labels.item.separator)}
        </span>
      </Link>
    </li>
  );
}
