import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';

type MissingItemRowProps = {
  readonly item: Item;
  /** Whom the item is for; left out for the home. */
  readonly entityName: string | undefined;
  readonly onToggle: (item: Item) => void;
};

/** One missing item: tick it when bought, untick to put it back; tap to open its page. */
export function MissingItemRow({ item, entityName, onToggle }: MissingItemRowProps): ReactElement {
  const bought = item.status === 'done';

  return (
    <li className="group flex gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 pt-3">
        <CheckButton
          checked={bought}
          label={bought ? labels.actions.markNotBought : labels.actions.markBought}
          onClick={() => {
            onToggle(item);
          }}
        />
      </span>
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 items-baseline gap-2 border-t border-line py-3 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span
          className={`min-w-0 flex-1 text-[15px] break-words ${bought ? 'text-muted line-through' : 'font-medium'}`}
        >
          {item.title}
        </span>
        {entityName !== undefined && (
          <span className="shrink-0 text-xs text-muted">
            {labels.shopping.forEntity} {entityName}
          </span>
        )}
      </Link>
    </li>
  );
}
