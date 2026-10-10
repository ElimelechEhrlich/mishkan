import type { ReactElement } from 'react';
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
    <li className="flex flex-col gap-3 border border-ink bg-surface p-3">
      <span className="font-medium break-words">{item.title}</span>
      {missing.includes('domain') && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-alert">{labels.missing.domain}</h3>
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
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-alert">{labels.missing.member}</h3>
          <MemberPicker
            members={members}
            onPick={(memberId) => {
              onUpdate(item.id, { member_id: memberId });
            }}
            onAddChild={onAddChild}
          />
        </section>
      )}
      {missing.includes('time') && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-alert">{labels.missing.time}</h3>
          <TimePicker
            onPick={(choice) => {
              onUpdate(item.id, choice);
            }}
          />
        </section>
      )}
    </li>
  );
}
