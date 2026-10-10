import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { missingFields } from '../../lib/itemRules';
import type { AreaWithDomains, Item, ItemUpdate, Member } from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { MemberPicker } from './MemberPicker';
import { TimePicker } from './TimePicker';

type ItemAssignProps = {
  readonly item: Item;
  readonly areas: readonly AreaWithDomains[];
  readonly members: readonly Member[];
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onAddChild: (name: string) => Promise<boolean>;
};

const headingClass = 'text-sm font-bold text-alert';

/** One incomplete item, with a picker for each thing it still lacks. */
export function ItemAssign({
  item,
  areas,
  members,
  onUpdate,
  onAddChild,
}: ItemAssignProps): ReactElement {
  const missing = missingFields(item);

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <Link to={`/item/${item.id}`} className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 font-medium break-words">{item.title}</span>
        {item.kind !== 'task' && (
          <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">
            {labels.kind[item.kind]}
          </span>
        )}
      </Link>
      {missing.includes('domain') && (
        <section className="flex flex-col gap-2">
          <h3 className={headingClass}>{labels.missing.domain}</h3>
          <DomainPicker
            areas={areas}
            value={null}
            onChange={(domainId) => {
              if (domainId !== null) {
                onUpdate(item.id, { domain_id: domainId });
              }
            }}
          />
        </section>
      )}
      {missing.includes('member') && (
        <section className="flex flex-col gap-2">
          <h3 className={headingClass}>{labels.missing.member}</h3>
          <MemberPicker
            members={members}
            value={null}
            onPick={(memberId) => {
              onUpdate(item.id, { member_id: memberId });
            }}
            onAddChild={onAddChild}
          />
        </section>
      )}
      {missing.includes('time') && (
        <section className="flex flex-col gap-2">
          <h3 className={headingClass}>{labels.missing.time}</h3>
          <TimePicker
            item={item}
            onPick={(choice) => {
              onUpdate(item.id, choice);
            }}
          />
        </section>
      )}
    </li>
  );
}
