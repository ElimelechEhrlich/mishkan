import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Member } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Card } from '../ui/Card';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';

type ChildrenSettingsProps = {
  readonly members: readonly Member[];
  readonly onAdd: (name: string) => Promise<boolean>;
  readonly onRemove: (memberId: string) => void;
};

export function ChildrenSettings({ members, onAdd, onRemove }: ChildrenSettingsProps): ReactElement {
  const children = members.filter((member) => member.role === 'child');

  return (
    <Card title={labels.sections.children}>
      <ul className="flex flex-col divide-y divide-line">
        {children.map((child) => (
          <li key={child.id} className="flex items-center justify-between gap-2 py-1">
            <span className="font-medium">{child.name}</span>
            <ConfirmIconButton
              label={labels.actions.delete}
              confirmLabel={labels.actions.confirmDelete}
              onConfirm={() => {
                onRemove(child.id);
              }}
            />
          </li>
        ))}
      </ul>
      <AddRow
        label={labels.fields.childName}
        onAdd={(name) => {
          void onAdd(name);
        }}
      />
    </Card>
  );
}
