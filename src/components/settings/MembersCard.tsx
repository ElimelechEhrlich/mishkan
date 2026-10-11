import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';

type MembersCardProps = {
  readonly members: readonly Member[];
  readonly onAddChild: (name: string) => Promise<boolean>;
  readonly onRemoveChild: (memberId: string) => void;
};

/** Everyone items can belong to. Children can be added and removed here. */
export function MembersCard({ members, onAddChild, onRemoveChild }: MembersCardProps): ReactElement {
  return (
    <Card title={labels.sections.members}>
      <ul className="flex flex-col divide-y divide-line">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 py-2">
            <Avatar name={member.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{member.name}</span>
              <span className="text-[13px] text-muted">{labels.memberRole[member.role]}</span>
            </span>
            {member.role === 'child' && (
              <ConfirmIconButton
                label={labels.actions.delete}
                confirmLabel={labels.actions.confirmDelete}
                onConfirm={() => {
                  onRemoveChild(member.id);
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <AddRow
        label={labels.fields.childName}
        onAdd={(name) => {
          void onAddChild(name);
        }}
      />
    </Card>
  );
}
