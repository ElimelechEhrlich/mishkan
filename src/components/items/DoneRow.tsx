import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { formatTimestampDate } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';

type DoneRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly onReopen: (itemId: string) => void;
};

/** A closed item: when it was done and by whom. Unticking brings it back. */
export function DoneRow({ item, lookups, onReopen }: DoneRowProps): ReactElement {
  const domainLabel = item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const doneBy = item.completed_by === null ? undefined : lookups.memberNames.get(item.completed_by);
  const doneOn = item.completed_at === null ? undefined : formatTimestampDate(item.completed_at);
  const details = [domainLabel, doneBy, doneOn].filter((part) => part !== undefined);

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface py-3 ps-3 pe-4 shadow-card">
      <CheckButton
        checked
        label={labels.actions.markOpen}
        onClick={() => {
          onReopen(item.id);
        }}
      />
      <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="break-words text-muted line-through">{item.title}</span>
        <span className="text-sm text-muted">
          {item.kind !== 'task' && (
            <span className="me-2 rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">
              {labels.kind[item.kind]}
            </span>
          )}
          {details.join(labels.item.separator)}
        </span>
      </Link>
    </li>
  );
}
