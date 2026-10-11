import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { CapturableKind, EntityWithDomains, NewItem } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import { DomainPicker } from './DomainPicker';

type QuickAddSheetProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
  /** The kind that is selected when the sheet opens. */
  readonly defaultKind?: CapturableKind;
  /** Opens the sheet right away, for the "new item" home-screen shortcut. */
  readonly initiallyOpen?: boolean;
};

const kinds = ['task', 'goal', 'issue', 'note'] as const satisfies readonly CapturableKind[];

/** The floating add button and the sheet it opens. Only the title is required. */
export function QuickAddSheet({
  entities,
  onAdd,
  defaultKind = 'task',
  initiallyOpen = false,
}: QuickAddSheetProps): ReactElement {
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CapturableKind>(defaultKind);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Bumped after each save so the picker starts again from the list of entities. */
  const [pickerVersion, setPickerVersion] = useState(0);

  const trimmedTitle = title.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmedTitle === '' || saving) {
      return;
    }
    setSaving(true);
    void onAdd({
      title: trimmedTitle,
      kind,
      domainId,
      parentId: null,
    }).then((saved) => {
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
        <DomainPicker
          key={pickerVersion}
          entities={entities}
          value={domainId}
          onChange={setDomainId}
        />
        {domainId === null && <p className="text-sm text-muted">{labels.capture.noDomainHint}</p>}
        <Button type="submit" disabled={trimmedTitle === '' || saving}>
          {labels.actions.save}
        </Button>
      </form>
    </div>
  );
}
