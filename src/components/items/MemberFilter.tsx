import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { Chip } from '../ui/Chip';

type MemberFilterProps = {
  readonly members: readonly Member[];
  readonly value: string | null;
  readonly onChange: (memberId: string | null) => void;
};

export function MemberFilter({ members, value, onChange }: MemberFilterProps): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip
        label={labels.filter.all}
        selected={value === null}
        onClick={() => {
          onChange(null);
        }}
      />
      {members.map((member) => (
        <Chip
          key={member.id}
          label={member.name}
          selected={member.id === value}
          onClick={() => {
            onChange(member.id);
          }}
        />
      ))}
    </div>
  );
}
