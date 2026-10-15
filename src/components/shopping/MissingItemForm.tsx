import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { shoppingLines } from '../../lib/shoppingLines';
import type { NewMissingItem, ShoppingCategory, ShoppingTarget } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MissingItemFields } from './MissingItemFields';
import { ShoppingListField } from './ShoppingListField';

type MissingItemFormProps = {
  /** Entities and their shopping domains, the home first. */
  readonly targets: readonly ShoppingTarget[];
  readonly onAdd: (newItem: NewMissingItem) => Promise<boolean>;
};

/**
 * What is missing, of which kind, and for whom (the home unless changed). The list is written
 * as a message, a line per item, and added in one tap; the kind and the entity stay chosen, so
 * the next list goes in straight away.
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

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <MissingItemFields
          category={category}
          onCategoryChange={setCategory}
          targets={targets}
          domainId={domainId}
          onDomainChange={setChosenDomainId}
        />
        <ShoppingListField value={text} onChange={setText} />
        <Button type="submit" disabled={titles.length === 0 || domainId === null || saving}>
          {labels.shopping.addCount(titles.length)}
        </Button>
      </form>
    </Card>
  );
}
