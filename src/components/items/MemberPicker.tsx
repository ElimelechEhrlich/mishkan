import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Chip } from '../ui/Chip';

type MemberPickerProps = {
  readonly members: readonly Member[];
  readonly value: string | null;
  readonly onPick: (memberId: string) => void;
  readonly onAddChild: (name: string) => Promise<boolean>;
};

/** Pick who an item belongs to. A new child can be added on the spot. */
export function MemberPicker({
  members,
  value,
  onPick,
  onAddChild,
}: MemberPickerProps): ReactElement {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Chip
            key={member.id}
            label={member.name}
            selected={member.id === value}
            onClick={() => {
              onPick(member.id);
            }}
          />
        ))}
        <Chip
          label={labels.actions.addChild}
          selected={adding}
          onClick={() => {
            setAdding(!adding);
          }}
        />
      </div>
      {adding && (
        <AddRow
          label={labels.fields.childName}
          onAdd={(name) => {
            void onAddChild(name).then((added) => {
              if (added) {
                setAdding(false);
              }
            });
          }}
        />
      )}
    </div>
  );
}
