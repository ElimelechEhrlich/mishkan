import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';

type MissingItemRowProps = {
  readonly item: Item;
  /** Whom the item is for; left out for the home. */
  readonly entityName: string | undefined;
  readonly onToggle: (item: Item) => void;
  /** Sets how much to buy, right in the row; null takes it off. Without it, it only shows. */
  readonly onQuantity?: (item: Item, quantity: string | null) => void;
};

/**
 * A quantity's number moved by one, as on the fixed list: from none, + is one and − stays
 * none; below one is none again. A unit after the number stays ("2 ק"ג" → "3 ק"ג").
 */
function stepped(quantity: string, by: number): string | null {
  const match = /^(\d+)(.*)$/.exec(quantity.trim());
  if (match === null) {
    return by > 0 ? '1' : null;
  }
  const next = Number(match[1]) + by;
  return next < 1 ? null : `${String(next)}${match[2] ?? ''}`;
}

/**
 * One missing item: tick it when bought, untick to put it back; tap to open its page. How much
 * to buy is set in the row itself: − / + for a number, or written freely ("2 ק"ג").
 */
export function MissingItemRow({
  item,
  entityName,
  onToggle,
  onQuantity,
}: MissingItemRowProps): ReactElement {
  const bought = item.status === 'done';
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.quantity ?? '');

  function save(value: string | null): void {
    const next = value === null || value.trim() === '' ? null : value.trim().slice(0, 40);
    setEditing(false);
    if (next !== item.quantity) {
      onQuantity?.(item, next);
    }
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    save(text);
  }

  return (
    <li className="group flex items-center gap-3 ps-3.5">
      <span className="w-5.5 shrink-0 self-start pt-3">
        <CheckButton
          checked={bought}
          label={bought ? labels.actions.markNotBought : labels.actions.markBought}
          onClick={() => {
            onToggle(item);
          }}
        />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 border-t border-line pe-2 group-first:border-t-0">
        <Link
          to={`/item/${item.id}`}
          className="flex min-w-0 flex-1 items-baseline gap-2 py-3 active:opacity-70"
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
        {editing ? (
          <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={labels.shopping.lessOf(item.title)}
              onClick={() => {
                setText(stepped(text, -1) ?? '');
              }}
              className="flex size-8 items-center justify-center rounded-full bg-paper text-primary transition active:scale-90"
            >
              <Icon name="minus" className="size-4" />
            </button>
            <input
              value={text}
              autoFocus
              dir="auto"
              enterKeyHint="done"
              aria-label={labels.shopping.quantity}
              placeholder={labels.shopping.quantity}
              onChange={(event) => {
                setText(event.target.value);
              }}
              className="h-8 w-16 rounded-lg border border-line bg-surface px-1.5 text-center text-[14px] outline-none focus:border-primary"
            />
            <button
              type="button"
              aria-label={labels.shopping.moreOf(item.title)}
              onClick={() => {
                setText(stepped(text, 1) ?? '');
              }}
              className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary transition active:scale-90"
            >
              <Icon name="plus" className="size-4" />
            </button>
            <button
              type="submit"
              aria-label={labels.shopping.saveQuantity}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-white transition active:scale-90"
            >
              <Icon name="check" className="size-4" />
            </button>
          </form>
        ) : (
          (item.quantity !== null || (onQuantity !== undefined && !bought)) && (
            <button
              type="button"
              disabled={onQuantity === undefined || bought}
              aria-label={labels.shopping.setQuantityOf(item.title)}
              onClick={() => {
                setText(item.quantity ?? '');
                setEditing(true);
              }}
              className={`flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold transition active:scale-95 ${
                item.quantity === null
                  ? 'text-faint'
                  : bought
                    ? 'bg-paper text-faint'
                    : 'bg-paper text-ink'
              }`}
            >
              {item.quantity ?? (
                <>
                  <Icon name="plus" className="size-3.5" />
                  {labels.shopping.quantity}
                </>
              )}
            </button>
          )
        )}
      </div>
    </li>
  );
}
