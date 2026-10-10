import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { Chip } from '../ui/Chip';

type MemberFilterProps = {
  readonly members: readonly Member[];
  readonly value: string | null;
  readonly onChange: (memberId: string | null) => void;
};

/** One scrolling line of chips: everyone, then each member. */
export function MemberFilter({ members, value, onChange }: MemberFilterProps): ReactElement {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <span className="shrink-0">
        <Chip
          label={labels.filter.all}
          selected={value === null}
          onClick={() => {
            onChange(null);
          }}
        />
      </span>
      {members.map((member) => (
        <span key={member.id} className="shrink-0">
          <Chip
            label={member.name}
            selected={member.id === value}
            onClick={() => {
              onChange(member.id);
            }}
          />
        </span>
      ))}
    </div>
  );
}
