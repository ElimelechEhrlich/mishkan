import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

type MemberPickerProps = {
  readonly members: readonly Member[];
  readonly onPick: (memberId: string) => void;
  readonly onAddChild: (name: string) => Promise<boolean>;
};

/** Pick who an item belongs to. A new child can be added on the spot. */
export function MemberPicker({ members, onPick, onAddChild }: MemberPickerProps): ReactElement {
  const [adding, setAdding] = useState(false);
  const [childName, setChildName] = useState('');
  const trimmedName = childName.trim();

  function handleAddChild(): void {
    void onAddChild(trimmedName).then((added) => {
      if (added) {
        setChildName('');
        setAdding(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Chip
            key={member.id}
            label={member.name}
            selected={false}
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
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <TextField label={labels.fields.childName} value={childName} onChange={setChildName} />
          <Button disabled={trimmedName === ''} onClick={handleAddChild}>
            {labels.actions.add}
          </Button>
        </div>
      )}
    </div>
  );
}
