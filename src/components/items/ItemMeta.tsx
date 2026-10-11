import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { isOverdue, recurrenceOf } from '../../lib/itemRules';
import { timeText } from '../../lib/itemText';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';

type ItemMetaProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly today: string;
  /** Leaves out the area color dot, for rows that show the color another way. */
  readonly hideTone?: boolean;
};

/** The small line under an item's title: area color, domain, member and time. */
export function ItemMeta({
  item,
  lookups,
  today,
  hideTone = false,
}: ItemMetaProps): ReactElement {
  const domainLabel = item.domain_id === null ? null : lookups.domainLabels.get(item.domain_id);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  const memberName = item.member_id === null ? null : lookups.memberNames.get(item.member_id);
  const time = timeText(item, today);
  const recurrence = recurrenceOf(item.recurrence_rule);
  const overdue = isOverdue(item, today);
  const parts = [domainLabel, memberName].filter((part) => part !== null && part !== undefined);

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-muted">
      {item.kind !== 'task' && (
        <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">
          {labels.kind[item.kind]}
        </span>
      )}
      {tone !== undefined && !hideTone && <span className={`size-2 rounded-full ${tone}`} />}
      {parts.length > 0 && <span>{parts.join(labels.item.separator)}</span>}
      {time !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 ${
            overdue ? 'bg-alert-soft font-medium text-alert' : 'bg-paper'
          }`}
        >
          {recurrence !== null && <Icon name="repeat" className="size-3.5" />}
          {time}
        </span>
      )}
    </span>
  );
}
