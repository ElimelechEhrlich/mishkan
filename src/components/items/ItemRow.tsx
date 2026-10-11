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

/** One item in a list: tick it off, or tap it to open its page. */
export function ItemRow({ item, lookups, today, onComplete }: ItemRowProps): ReactElement {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-card transition active:scale-[0.99]">
      {item.kind !== 'note' && (
        <CheckButton
          checked={false}
          label={labels.actions.markDone}
          onClick={() => {
            onComplete(item);
          }}
        />
      )}
      <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[17px] leading-6 font-medium break-words">{item.title}</span>
        <ItemMeta item={item} lookups={lookups} today={today} />
      </Link>
    </li>
  );
}
