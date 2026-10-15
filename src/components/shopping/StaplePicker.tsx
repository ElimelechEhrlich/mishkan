import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { byDepartment, titleKey } from '../../lib/departments';
import type { ShoppingDepartment, ShoppingStaple } from '../../types/domain';
import { Button } from '../ui/Button';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';
import { InlineEdit } from '../ui/InlineEdit';

type StaplePickerProps = {
  /** The most added first; the order holds inside each department. */
  readonly staples: readonly ShoppingStaple[];
  readonly departments: readonly ShoppingDepartment[];
  /** An item's name to the department chosen for it. */
  readonly chosen: ReadonlyMap<string, string>;
  /** Names (as `titleKey`) already on the shopping list. */
  readonly listed: ReadonlySet<string>;
  readonly saving: boolean;
  readonly onAdd: (titles: readonly string[]) => void;
  readonly onRename: (stapleId: string, title: string) => void;
  readonly onRemove: (stapleId: string) => void;
};

/**
 * The fixed shopping list, by department in the shop's order: what is needed this time is
 * ticked and added to the shopping list in one tap. What is already on the list shows ticked.
 * In editing, a name can be changed or taken off the fixed list.
 */
export function StaplePicker({
  staples,
  departments,
  chosen,
  listed,
  saving,
  onAdd,
  onRename,
  onRemove,
}: StaplePickerProps): ReactElement {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const toAdd = staples.filter((staple) => picked.has(staple.id));

  function toggle(stapleId: string): void {
    const next = new Set(picked);
    if (next.has(stapleId)) {
      next.delete(stapleId);
    } else {
      next.add(stapleId);
    }
    setPicked(next);
  }

  return (
    <div className="flex flex-col gap-3 pb-24">
      <div className="flex items-start justify-between gap-3 px-1">
        <p className="text-[13px] text-muted">{labels.staples.hint}</p>
        <button
          type="button"
          onClick={() => {
            setEditing(!editing);
          }}
          className="min-h-9 shrink-0 px-1.5 text-[13px] font-semibold text-primary"
        >
          {editing ? labels.staples.doneEditing : labels.staples.edit}
        </button>
      </div>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {byDepartment(staples, departments, chosen).flatMap((group) => [
          <li
            key={`department-${group.department?.id ?? 'other'}`}
            className="border-t border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-muted first:border-t-0"
          >
            {group.department?.name ?? labels.departments.other}
          </li>,
          ...group.items.map((staple) => {
            const onList = listed.has(titleKey(staple.title));
            const ticked = onList || picked.has(staple.id);
            return (
              <li
                key={staple.id}
                className="flex min-h-12 items-center gap-3 border-t border-line px-3.5"
              >
                {editing ? (
                  <>
                    <InlineEdit
                      value={staple.title}
                      onSave={(title) => {
                        onRename(staple.id, title);
                      }}
                      textClass="text-[15px]"
                    />
                    <ConfirmIconButton
                      label={labels.staples.remove}
                      confirmLabel={labels.staples.confirmRemove}
                      onConfirm={() => {
                        onRemove(staple.id);
                      }}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={ticked}
                    disabled={onList}
                    onClick={() => {
                      toggle(staple.id);
                    }}
                    className="flex min-h-12 flex-1 items-center gap-3 text-start"
                  >
                    <span
                      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 ${
                        ticked ? 'border-primary bg-primary text-white' : 'border-faint bg-surface'
                      }`}
                    >
                      {ticked && <Icon name="check" className="size-3.5" />}
                    </span>
                    <span
                      className={`flex-1 text-[15px] ${ticked ? 'font-medium' : ''} ${onList ? 'text-muted' : ''}`}
                    >
                      {staple.title}
                    </span>
                    {onList && <span className="text-xs text-muted">{labels.staples.inList}</span>}
                  </button>
                )}
              </li>
            );
          }),
        ])}
      </ul>
      {!editing && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl flex-col px-4">
          <Button
            disabled={toAdd.length === 0 || saving}
            onClick={() => {
              onAdd(toAdd.map((staple) => staple.title));
            }}
          >
            {labels.staples.add(toAdd.length)}
          </Button>
        </div>
      )}
    </div>
  );
}
