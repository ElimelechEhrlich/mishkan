import { useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item, ItemUpdate } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';

type ItemHeadingProps = {
  readonly item: Item;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  /** The circle that marks the item done, when it has one. */
  readonly check?:
    | { readonly checked: boolean; readonly label: string; readonly onClick: () => void }
    | undefined;
};

/**
 * The top of an item's page: its title as a heading that is edited in place, and its notes
 * under it. Each is saved when the field is left, only when it changed.
 */
export function ItemHeading({ item, onUpdate, check }: ItemHeadingProps): ReactElement {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [writingNotes, setWritingNotes] = useState(false);

  function saveTitle(): void {
    const trimmed = title.trim();
    if (trimmed === '') {
      setTitle(item.title);
    } else if (trimmed !== item.title) {
      onUpdate(item.id, { title: trimmed });
    }
  }

  function saveNotes(): void {
    const trimmed = notes.trim();
    if (trimmed !== (item.notes ?? '')) {
      onUpdate(item.id, { notes: trimmed === '' ? null : trimmed });
    }
    setWritingNotes(false);
  }

  // The title is one line of text: Enter ends the editing instead of breaking the line.
  function endOnEnter(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        {check !== undefined && (
          <span className="pt-2.5">
            <CheckButton checked={check.checked} label={check.label} onClick={check.onClick} />
          </span>
        )}
        <textarea
          aria-label={labels.fields.title}
          rows={1}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          onKeyDown={endOnEnter}
          onBlur={saveTitle}
          className={`field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-transparent py-1 font-display text-[22px] leading-8 font-bold focus:bg-surface focus:outline-none ${
            item.status === 'done' ? 'text-muted line-through' : ''
          }`}
        />
      </div>
      {notes !== '' || writingNotes ? (
        <textarea
          aria-label={labels.fields.notes}
          rows={1}
          value={notes}
          autoFocus={writingNotes && notes === ''}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          onBlur={saveNotes}
          placeholder={labels.fields.notes}
          className="field-sizing-content resize-none rounded-lg bg-transparent py-1 text-[15px] leading-relaxed text-muted focus:bg-surface focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setWritingNotes(true);
          }}
          className="inline-flex min-h-8 items-center gap-1 self-start text-[13px] font-medium text-faint transition active:scale-[0.97]"
        >
          <Icon name="plus" className="size-3.5" />
          {labels.item.addNote}
        </button>
      )}
    </div>
  );
}
