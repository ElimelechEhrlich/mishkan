import { useState } from 'react';
import { Link } from 'react-router';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { shoppingLines } from '../../lib/shoppingLines';
import type { NewMissingItem, ShoppingCategory, ShoppingTarget } from '../../types/domain';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { MissingItemFields } from './MissingItemFields';
import { ShoppingListField } from './ShoppingListField';

type MissingItemFormProps = {
  /** Entities and their shopping domains, the home first. */
  readonly targets: readonly ShoppingTarget[];
  readonly onAdd: (newItem: NewMissingItem) => Promise<boolean>;
};

/**
 * What is missing, of which kind, and for whom (the home unless changed). Folded to one line,
 * with "+" and the way to the standing list beside it, so the shopping list shows right under
 * it; the kind and for whom open once something is written. The list is written as a message, a
 * line per item, and added in one tap; the kind and the entity stay chosen for the next list.
 */
export function MissingItemForm({ targets, onAdd }: MissingItemFormProps): ReactElement {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [chosenDomainId, setChosenDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const domainId = chosenDomainId ?? targets[0]?.domainId ?? null;
  const titles = shoppingLines(text);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (titles.length === 0 || domainId === null || saving) {
      return;
    }
    setSaving(true);
    void onAdd({ titles, category, domainId }).then((saved) => {
      setSaving(false);
      if (saved) {
        setText('');
      }
    });
  }

  const open = text.trim() !== '';

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ShoppingListField value={text} onChange={setText} folded />
          </div>
          {open ? (
            <button
              type="submit"
              aria-label={labels.shopping.addCount(titles.length)}
              disabled={domainId === null || saving}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-card transition active:scale-95 disabled:opacity-50"
            >
              <Icon name="plus" className="size-6" />
            </button>
          ) : (
            <Link
              to="/shopping/staples"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
            >
              <Icon name="list" className="size-4.5" />
              {labels.staples.short}
            </Link>
          )}
        </div>
        {open && (
          <>
            <MissingItemFields
              category={category}
              onCategoryChange={setCategory}
              targets={targets}
              domainId={domainId}
              onDomainChange={setChosenDomainId}
            />
            {titles.length > 1 && (
              <p className="text-[13px] text-muted">{labels.shopping.addCount(titles.length)}</p>
            )}
          </>
        )}
      </form>
    </Card>
  );
}
