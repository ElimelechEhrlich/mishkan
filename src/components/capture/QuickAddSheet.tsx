import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { AreaWithDomains, NewItem } from '../../types/domain';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { DomainPicker } from './DomainPicker';

type QuickAddSheetProps = {
  readonly areas: readonly AreaWithDomains[];
  readonly currentMemberId: string;
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
};

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
export function QuickAddSheet({ areas, currentMemberId, onAdd }: QuickAddSheetProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
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
      domainId,
      memberId: defaultMemberId(areas, domainId, currentMemberId),
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
        className="fixed start-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center border border-ink bg-accent text-3xl leading-none text-paper"
      >
        +
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-ink/40">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto border-t-2 border-ink bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <TextField label={labels.fields.itemTitle} value={title} onChange={setTitle} autoFocus />
        <DomainPicker key={pickerVersion} areas={areas} value={domainId} onChange={setDomainId} />
        {domainId === null && <p className="text-sm text-muted">{labels.capture.noDomainHint}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" disabled={trimmedTitle === '' || saving}>
            {labels.actions.save}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
          >
            {labels.actions.close}
          </Button>
        </div>
      </form>
    </div>
  );
}
