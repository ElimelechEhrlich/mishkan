import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { EntityWithDomains, Item, ItemUpdate } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { ItemAssign } from './ItemAssign';

type IncompleteListProps = {
  readonly items: readonly Item[];
  readonly entities: readonly EntityWithDomains[];
  readonly loading: boolean;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
};

export function IncompleteList({
  items,
  entities,
  loading,
  onUpdate,
}: IncompleteListProps): ReactElement {
  if (items.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.nothingMissing} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <ItemAssign key={item.id} item={item} entities={entities} onUpdate={onUpdate} />
      ))}
    </ul>
  );
}
