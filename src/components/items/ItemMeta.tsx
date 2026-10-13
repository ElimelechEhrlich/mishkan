import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { recurrenceOf } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item, MeetingPlace } from '../../types/domain';
import { DueText } from './DueText';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

const placeIcons = {
  in_person: 'pin',
  phone: 'phone',
  video: 'video',
} as const satisfies Record<MeetingPlace, IconName>;

type ItemMetaProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly today: string;
  /** Leaves out the domain, for a step shown inside its goal. */
  readonly hideDomain?: boolean;
  /** Adds when it is due, for places that do not show it at the end of the row. */
  readonly showTime?: boolean;
  /** A short extra tag at the end, such as a goal's progress. */
  readonly extra?: string | undefined;
};

/** The small line under an item's title: its kind, entity color and domain, and its rhythm. */
export function ItemMeta({
  item,
  lookups,
  today,
  hideDomain = false,
  showTime = false,
  extra,
}: ItemMetaProps): ReactElement {
  const domainLabel =
    item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  const recurrence = recurrenceOf(item.recurrence_rule);

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-muted">
      {item.kind !== 'task' && (
        <span className="rounded-[5px] bg-line/70 px-1.5 text-[11px] font-semibold">
          {item.kind === 'note' && item.is_value ? labels.data.pair : labels.kind[item.kind]}
        </span>
      )}
      {!hideDomain && domainLabel !== undefined && (
        <span className="inline-flex items-center gap-1.5">
          {tone !== undefined && <span className={`size-1.5 rounded-full ${tone.bg}`} />}
          {domainLabel}
        </span>
      )}
      {item.kind === 'appointment' && item.with_whom !== null && <span>{item.with_whom}</span>}
      {item.kind === 'appointment' && item.place_kind !== null && (
        <span className="inline-flex items-center gap-1">
          <Icon name={placeIcons[item.place_kind]} className="size-3" />
          {item.place_kind === 'in_person' && item.place !== null
            ? item.place
            : labels.meetingPlace[item.place_kind]}
        </span>
      )}
      {recurrence !== null && (
        <span className="inline-flex items-center gap-1">
          <Icon name="repeat" className="size-3" />
          {labels.recurrence[recurrence]}
        </span>
      )}
      {extra !== undefined && (
        <span className="rounded-[5px] bg-line/70 px-1.5 text-[11px] font-semibold">{extra}</span>
      )}
      {showTime && <DueText item={item} today={today} />}
    </span>
  );
}
