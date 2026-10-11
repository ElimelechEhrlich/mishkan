import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { AddableEntityKind } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';

type AddEntityCardProps = {
  readonly onAdd: (kind: AddableEntityKind, name: string) => void;
};

/** Two rows that open a name field: a new child, or a parent who has not joined yet. */
export function AddEntityCard({ onAdd }: AddEntityCardProps): ReactElement {
  const [adding, setAdding] = useState<AddableEntityKind | null>(null);

  function toggle(kind: AddableEntityKind): void {
    setAdding(adding === kind ? null : kind);
  }

  const chevron = (kind: AddableEntityKind): ReactElement => (
    <Icon
      name="down"
      className={`size-4 text-faint transition-transform ${adding === kind ? 'rotate-180' : ''}`}
    />
  );

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.settings.addEntity}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        <ListRow
          icon="plus"
          title={labels.settings.addChild}
          onClick={() => {
            toggle('child');
          }}
          trailing={chevron('child')}
        />
        {adding === 'child' && (
          <div className="px-3.5 pb-3.5">
            <AddRow
              label={labels.fields.childName}
              onAdd={(name) => {
                onAdd('child', name);
                setAdding(null);
              }}
            />
          </div>
        )}
        <ListRow
          icon="userPlus"
          title={labels.settings.addParent}
          subtitle={labels.settings.addParentShort}
          onClick={() => {
            toggle('parent');
          }}
          trailing={chevron('parent')}
        />
        {adding === 'parent' && (
          <div className="flex flex-col gap-2 px-3.5 pb-3.5">
            <AddRow
              label={labels.fields.parentName}
              onAdd={(name) => {
                onAdd('parent', name);
                setAdding(null);
              }}
            />
            <p className="text-[13px] leading-5 text-muted">{labels.settings.addParentHint}</p>
          </div>
        )}
      </div>
    </section>
  );
}
