import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { AreaWithDomains, Item, ItemUpdate, Member } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { ItemAssign } from './ItemAssign';

type IncompleteListProps = {
  readonly items: readonly Item[];
  readonly areas: readonly AreaWithDomains[];
  readonly members: readonly Member[];
  readonly loading: boolean;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onAddChild: (name: string) => Promise<boolean>;
};

export function IncompleteList({
  items,
  areas,
  members,
  loading,
  onUpdate,
  onAddChild,
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
          areas={areas}
          members={members}
          onUpdate={onUpdate}
          onAddChild={onAddChild}
        />
      ))}
    </ul>
  );
}
