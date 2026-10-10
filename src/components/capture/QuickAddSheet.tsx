import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { AreaWithDomains, CapturableKind, NewItem } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import { DomainPicker } from './DomainPicker';

type QuickAddSheetProps = {
  readonly areas: readonly AreaWithDomains[];
  readonly currentMemberId: string;
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
  /** The kind that is selected when the sheet opens. */
  readonly defaultKind?: CapturableKind;
};

const kinds = ['task', 'goal', 'issue', 'note'] as const satisfies readonly CapturableKind[];

/** An item in a private domain belongs to the parent who wrote it. */
function defaultMemberId(
  areas: readonly AreaWithDomains[],
  domainId: string | null,
  currentMemberId: string,
): string | null {
  if (domainId === null) {
    return null;
  }
  const domain = areas.flatMap((area) => area.domains).find((candidate) => candidate.id === domainId);
  return domain?.visibility === 'private' ? currentMemberId : null;
}

/** The floating add button and the sheet it opens. Only the title is required. */
export function QuickAddSheet({
  areas,
  currentMemberId,
  onAdd,
  defaultKind = 'task',
}: QuickAddSheetProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CapturableKind>(defaultKind);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Bumped after each save so the picker starts again from the list of areas. */
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
      memberId: defaultMemberId(areas, domainId, currentMemberId),
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
        className="fixed start-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-float transition active:scale-95"
      >
        <Icon name="plus" className="size-7" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-ink/40">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-h-[88dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-3xl bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-sheet"
      >
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
        <DomainPicker key={pickerVersion} areas={areas} value={domainId} onChange={setDomainId} />
        {domainId === null && <p className="text-sm text-muted">{labels.capture.noDomainHint}</p>}
        <Button type="submit" disabled={trimmedTitle === '' || saving}>
          {labels.actions.save}
        </Button>
      </form>
    </div>
  );
}
