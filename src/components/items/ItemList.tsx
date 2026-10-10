import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { isOverdue, todayIso } from '../../lib/itemRules';
import type { AreaWithDomains, Item, Member } from '../../types/domain';
import { ItemRow } from './ItemRow';

type ItemListProps = {
  readonly items: readonly Item[];
  readonly areas: readonly AreaWithDomains[];
  readonly members: readonly Member[];
  /** null shows every member's items. */
  readonly memberFilter: string | null;
  readonly loading: boolean;
  readonly onComplete: (itemId: string) => void;
};

export function ItemList({
  items,
  areas,
  members,
  memberFilter,
  loading,
  onComplete,
}: ItemListProps): ReactElement {
  const domainLabels = useMemo(() => {
    const result = new Map<string, string>();
    for (const area of areas) {
      for (const domain of area.domains) {
        result.set(domain.id, `${area.name}${labels.item.separator}${domain.name}`);
      }
    }
    return result;
  }, [areas]);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );

  const visible = items.filter((item) => memberFilter === null || item.member_id === memberFilter);
  const today = todayIso();

  if (visible.length === 0) {
    return <p className="py-8 text-center text-muted">{loading ? labels.status.loading : labels.status.noOpenItems}</p>;
  }

  return (
    <ul className="flex flex-col">
      {visible.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          domainLabel={item.domain_id === null ? null : (domainLabels.get(item.domain_id) ?? null)}
          memberName={item.member_id === null ? null : (memberNames.get(item.member_id) ?? null)}
          overdue={isOverdue(item, today)}
          onComplete={onComplete}
        />
      ))}
    </ul>
  );
}
