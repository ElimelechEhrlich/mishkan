import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { ItemMeta } from './ItemMeta';

type ItemRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
};

/** How long a row stays ticked before it gives up waiting for the list to refresh. */
const completingTimeoutMs = 4000;

/** One item in a list: tick it off, or tap it to open its page. */
export function ItemRow({ item, lookups, today, onComplete }: ItemRowProps): ReactElement {
  const [completing, setCompleting] = useState(false);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);

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
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl bg-surface py-3.5 ps-5 pe-4 shadow-card transition duration-300 ${
        completing ? 'scale-[0.98] opacity-50' : 'active:scale-[0.99]'
      }`}
    >
      {tone !== undefined && (
        <span className={`absolute inset-y-3 start-1.5 w-1 rounded-full ${tone}`} />
      )}
      {item.kind !== 'note' && (
        <CheckButton
          checked={completing}
          label={labels.actions.markDone}
          onClick={() => {
            if (!completing) {
              setCompleting(true);
              onComplete(item);
            }
          }}
        />
      )}
      <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`text-[17px] leading-6 font-medium break-words ${completing ? 'line-through' : ''}`}
        >
          {item.title}
        </span>
        <ItemMeta item={item} lookups={lookups} today={today} hideTone />
      </Link>
    </li>
  );
}
