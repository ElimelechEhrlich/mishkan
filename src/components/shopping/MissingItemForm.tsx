import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { NewMissingItem, ShoppingCategory, ShoppingTarget } from '../../types/domain';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { TextField } from '../ui/TextField';
import { MissingItemFields } from './MissingItemFields';

type MissingItemFormProps = {
  /** Entities and their shopping domains, the home first. */
  readonly targets: readonly ShoppingTarget[];
  readonly onAdd: (newItem: NewMissingItem) => Promise<boolean>;
};

/**
 * What is missing, of which kind, and for whom (the home unless changed).
 * The kind and the entity stay chosen after adding, so several items go in quickly.
 */
export function MissingItemForm({ targets, onAdd }: MissingItemFormProps): ReactElement {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [chosenDomainId, setChosenDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const domainId = chosenDomainId ?? targets[0]?.domainId ?? null;
  const trimmed = title.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmed === '' || domainId === null || saving) {
      return;
    }
    setSaving(true);
    void onAdd({ title: trimmed, category, domainId }).then((saved) => {
      setSaving(false);
      if (saved) {
        setTitle('');
      }
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TextField
            label={labels.fields.missingItem}
            value={title}
            onChange={setTitle}
            compact
          />
          <button
            type="submit"
            aria-label={labels.actions.add}
            disabled={trimmed === '' || domainId === null || saving}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition active:scale-95 disabled:opacity-40"
          >
            <Icon name="plus" />
          </button>
        </div>
        <MissingItemFields
          category={category}
          onCategoryChange={setCategory}
          targets={targets}
          domainId={domainId}
          onDomainChange={setChosenDomainId}
        />
      </form>
    </Card>
  );
}
