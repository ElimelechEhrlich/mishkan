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
  /** Reloads the entities after a child or domain is added while choosing a domain. */
  readonly onStructureChanged: () => Promise<void>;
};

export function IncompleteList({
  items,
  entities,
  loading,
  onUpdate,
  onStructureChanged,
}: IncompleteListProps): ReactElement {
  if (items.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.status.nothingMissing} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <ItemAssign
          key={item.id}
          item={item}
          entities={entities}
          onUpdate={onUpdate}
          onStructureChanged={onStructureChanged}
        />
      ))}
    </ul>
  );
}
