import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { shoppingTargets } from '../../lib/lookups';
import type {
  CapturableKind,
  EntityWithDomains,
  NewItem,
  NewMissingItem,
  ShoppingCategory,
} from '../../types/domain';
import { MissingItemFields } from '../shopping/MissingItemFields';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import { DomainPicker } from './DomainPicker';

type QuickAddSheetProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
  readonly onAddMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  /** The kind that is selected when the sheet opens. */
  readonly defaultKind?: CapturableKind;
  /** Opens the sheet right away, for the "new item" home-screen shortcut. */
  readonly initiallyOpen?: boolean;
};

/** A missing item can be added here too; it then asks for its kind and whom it is for. */
type QuickAddKind = CapturableKind | 'missing_item';

const kinds = [
  'task',
  'goal',
  'issue',
  'note',
  'missing_item',
] as const satisfies readonly QuickAddKind[];

/**
 * The floating add button and the sheet it opens. Only the title is required,
 * except for a missing item, which always lands in a shopping domain (the home's by default).
 */
export function QuickAddSheet({
  entities,
  onAdd,
  onAddMissingItem,
  defaultKind = 'task',
  initiallyOpen = false,
}: QuickAddSheetProps): ReactElement {
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<QuickAddKind>(defaultKind);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [shoppingDomainId, setShoppingDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Bumped after each save so the picker starts again from the list of entities. */
  const [pickerVersion, setPickerVersion] = useState(0);

  const trimmedTitle = title.trim();
  const targets = shoppingTargets(entities);
  const missingItemDomainId = shoppingDomainId ?? targets[0]?.domainId ?? null;
  const canSave =
    trimmedTitle !== '' && !saving && (kind !== 'missing_item' || missingItemDomainId !== null);

  function save(): Promise<boolean> {
    if (kind === 'missing_item') {
      return missingItemDomainId === null
        ? Promise.resolve(false)
        : onAddMissingItem({ title: trimmedTitle, category, domainId: missingItemDomainId });
    }
    return onAdd({ title: trimmedTitle, kind, domainId, parentId: null });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setSaving(true);
    void save().then((saved) => {
      setSaving(false);
      if (saved) {
        setTitle('');
        setDomainId(null);
        setPickerVersion((version) => version + 1);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label={labels.actions.newItem}
        onClick={() => {
          setOpen(true);
        }}
        className="fixed start-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-[20px] bg-primary text-white shadow-float transition active:scale-95"
      >
        <Icon name="plus" className="size-7" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex animate-fade-in flex-col justify-end bg-ink/40">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-h-[88dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-3xl bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-sheet animate-sheet-up"
      >
        <span className="mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{labels.actions.newItem}</h2>
          <IconButton
            icon="close"
            label={labels.actions.close}
            onClick={() => {
              setOpen(false);
            }}
          />
        </div>
        <TextField
          label={labels.fields.itemTitle}
          value={title}
          onChange={setTitle}
          autoFocus
          compact
        />
        <div className="flex flex-wrap gap-2">
          {kinds.map((option) => (
            <Chip
              key={option}
              label={labels.kind[option]}
              selected={option === kind}
              onClick={() => {
                setKind(option);
              }}
            />
          ))}
        </div>
        {kind === 'missing_item' ? (
          <MissingItemFields
            category={category}
            onCategoryChange={setCategory}
            targets={targets}
            domainId={missingItemDomainId}
            onDomainChange={setShoppingDomainId}
          />
        ) : (
          <>
            <DomainPicker
              key={pickerVersion}
              entities={entities}
              value={domainId}
              onChange={setDomainId}
            />
            {domainId === null && (
              <p className="text-sm text-muted">{labels.capture.noDomainHint}</p>
            )}
          </>
        )}
        <Button type="submit" disabled={!canSave}>
          {labels.actions.save}
        </Button>
      </form>
    </div>
  );
}
