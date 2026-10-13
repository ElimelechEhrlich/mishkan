import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { CopyButton } from '../ui/CopyButton';
import { DueText } from './DueText';
import { ItemMeta } from './ItemMeta';

type ItemRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
  /** Leaves out the domain, on a page that already groups by it. */
  readonly hideDomain?: boolean;
};

/** How long a row stays ticked before it gives up waiting for the list to refresh. */
const completingTimeoutMs = 4000;

/**
 * One item in a list card: tick it off, or tap it to open its page.
 * The divider above it starts after the check, so the checks line up in one column.
 */
export function ItemRow({
  item,
  lookups,
  today,
  onComplete,
  hideDomain = false,
}: ItemRowProps): ReactElement {
  const [completing, setCompleting] = useState(false);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  // A note kept for one value, such as the gate's code, shows it right in the list.
  const kept = lookups.itemData.get(item.id);
  const single = item.kind === 'note' && kept?.length === 1 ? kept[0] : undefined;

  // If the save fails the row would stay ticked forever, so it is released after a while.
  useEffect(() => {
    if (!completing) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCompleting(false);
    }, completingTimeoutMs);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [completing]);

  return (
    <li
      className={`group flex gap-3 ps-3.5 transition duration-300 ${completing ? 'opacity-40' : ''}`}
    >
      <span className="w-5.5 shrink-0 pt-2">
        {item.kind !== 'note' && (
          <CheckButton
            checked={completing}
            label={labels.actions.markDone}
            toneClass={tone?.border}
            onClick={() => {
              if (!completing) {
                setCompleting(true);
                onComplete(item);
              }
            }}
          />
        )}
      </span>
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 items-start gap-3 border-t border-line py-2 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`text-[14px] leading-snug font-medium break-words ${completing ? 'line-through' : ''}`}
          >
            {item.title}
          </span>
          {single !== undefined && single.value !== '' && (
            <span className="text-[15px] font-semibold break-words" dir="auto">
              {single.value}
            </span>
          )}
          <ItemMeta item={item} lookups={lookups} today={today} hideDomain={hideDomain} />
        </span>
        {single !== undefined && single.value !== '' ? (
          <CopyButton text={single.value} />
        ) : (
          <span className="pt-0.5">
            <DueText item={item} today={today} />
          </span>
        )}
      </Link>
    </li>
  );
}
