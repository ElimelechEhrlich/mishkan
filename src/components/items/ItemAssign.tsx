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

/**
 * One incomplete item. It lists what is still missing and asks for one thing
 * at a time; once that is chosen, the next one takes its place.
 */
export function ItemAssign({
  item,
  areas,
  members,
  onUpdate,
  onAddChild,
}: ItemAssignProps): ReactElement {
  const missing = missingFields(item);
  const current = missing[0];

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <Link to={`/item/${item.id}`} className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-[17px] font-semibold break-words">{item.title}</span>
        {item.kind !== 'task' && (
          <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">
            {labels.kind[item.kind]}
          </span>
        )}
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((field) => (
          <span
            key={field}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              field === current ? 'bg-alert-soft text-alert' : 'bg-paper text-muted'
            }`}
          >
            {labels.missing[field]}
          </span>
        ))}
      </div>
      {current === 'domain' && (
        <DomainPicker
          areas={areas}
          value={null}
          onChange={(domainId) => {
            if (domainId !== null) {
              onUpdate(item.id, { domain_id: domainId });
            }
          }}
        />
      )}
      {current === 'member' && (
        <MemberPicker
          members={members}
          value={null}
          onPick={(memberId) => {
            onUpdate(item.id, { member_id: memberId });
          }}
          onAddChild={onAddChild}
        />
      )}
      {current === 'time' && (
        <TimePicker
          item={item}
          onPick={(choice) => {
            onUpdate(item.id, choice);
          }}
        />
      )}
    </li>
  );
}
