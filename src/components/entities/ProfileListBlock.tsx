import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ProfileList } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';

type ProfileListBlockProps = {
  readonly list: ProfileList;
  readonly onAddValue: (listId: string, value: string) => void;
  readonly onRemoveValue: (valueId: string) => void;
  readonly onRemoveList: (listId: string) => void;
};

/** An open list on a profile, such as hobbies: its values as chips, and a line to add more. */
export function ProfileListBlock({
  list,
  onAddValue,
  onRemoveValue,
  onRemoveList,
}: ProfileListBlockProps): ReactElement {
  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[15px] font-semibold">{list.title}</h3>
        <ConfirmIconButton
          label={labels.profile.deleteList}
          confirmLabel={labels.actions.confirmDelete}
          onConfirm={() => {
            onRemoveList(list.id);
          }}
        />
      </div>
      {list.values.length === 0 ? (
        <p className="text-[13px] text-faint">{labels.profile.emptyList}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {list.values.map((value) => (
            <li
              key={value.id}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-soft ps-3 pe-1 text-[13px] font-medium text-primary"
            >
              {value.value}
              <button
                type="button"
                aria-label={`${labels.profile.removeValue} ${value.value}`}
                onClick={() => {
                  onRemoveValue(value.id);
                }}
                className="flex size-6 items-center justify-center rounded-full transition active:bg-primary/15"
              >
                <Icon name="close" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow
        label={`${labels.profile.newValue} ${list.title}`}
        onAdd={(value) => {
          onAddValue(list.id, value);
        }}
      />
    </div>
  );
}
