import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';
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
    <li className="flex items-center gap-3 rounded-2xl bg-surface py-3 ps-3 pe-2 shadow-card">
      {item.kind !== 'note' && (
        <CheckButton
          checked={false}
          label={labels.actions.markDone}
          onClick={() => {
            onComplete(item);
          }}
        />
      )}
      <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium break-words">{item.title}</span>
          <ItemMeta item={item} lookups={lookups} today={today} />
        </span>
        <Icon name="forward" className="size-4 text-muted/60" />
      </Link>
    </li>
  );
}
