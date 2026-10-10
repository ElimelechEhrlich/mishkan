import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { DoneRow } from './DoneRow';

type DoneListProps = {
  readonly items: readonly Item[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onReopen: (itemId: string) => void;
};

export function DoneList({ items, lookups, loading, onReopen }: DoneListProps): ReactElement {
  if (items.length === 0) {
    return <EmptyState text={loading ? labels.status.loading : labels.status.noDoneItems} />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <DoneRow key={item.id} item={item} lookups={lookups} onReopen={onReopen} />
      ))}
    </ul>
  );
}
