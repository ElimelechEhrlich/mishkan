import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { DoneRow } from './DoneRow';

type DoneListProps = {
  readonly items: readonly Item[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onReopen: (itemId: string) => void;
};

export function DoneList({ items, lookups, loading, onReopen }: DoneListProps): ReactElement {
  if (items.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.noDoneItems} />;
  }

  return (
    <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
      {items.map((item) => (
        <DoneRow key={item.id} item={item} lookups={lookups} onReopen={onReopen} />
      ))}
    </ul>
  );
}
