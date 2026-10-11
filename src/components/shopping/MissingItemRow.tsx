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
    <li className="flex items-center gap-3 py-2.5">
      <CheckButton
        checked={bought}
        label={bought ? labels.actions.markNotBought : labels.actions.markBought}
        onClick={() => {
          onToggle(item);
        }}
      />
      <Link to={`/item/${item.id}`} className="flex min-w-0 flex-1 items-baseline gap-2">
        <span
          className={`min-w-0 flex-1 break-words ${bought ? 'text-muted line-through' : 'font-medium'}`}
        >
          {item.title}
        </span>
        {entityName !== undefined && (
          <span className="shrink-0 text-[13px] text-muted">
            {labels.shopping.forEntity} {entityName}
          </span>
        )}
      </Link>
    </li>
  );
}
