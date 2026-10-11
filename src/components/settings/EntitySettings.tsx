import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useEntitySettings } from '../../hooks/useEntitySettings';
import { entityTone } from '../../lib/lookups';
import type { EntityWithDomains, Member } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { ErrorBanner } from '../ui/ErrorBanner';
import { EntitySettingsCard } from './EntitySettingsCard';

type EntitySettingsProps = {
  readonly member: Member;
  readonly entities: readonly EntityWithDomains[];
  readonly reload: () => Promise<void>;
};

/** Every entity with its domains. Children, and parents who have not joined yet, are added here. */
export function EntitySettings({ member, entities, reload }: EntitySettingsProps): ReactElement {
  const settings = useEntitySettings(member, entities, reload);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 pt-2 text-[13px] font-bold tracking-wide text-muted">
        {labels.sections.entities}
      </h2>
      <ErrorBanner message={settings.error} />
      {entities.map((entity, index) => (
        <EntitySettingsCard
          key={entity.id}
          entity={entity}
          toneClass={entityTone(index).bg}
          settings={settings}
        />
      ))}
      <AddRow
        label={labels.fields.childName}
        onAdd={(name) => {
          settings.addEntity('child', name);
        }}
      />
      <AddRow
        label={labels.fields.parentName}
        onAdd={(name) => {
          settings.addEntity('parent', name);
        }}
      />
      <p className="px-1 text-sm text-muted">{labels.settings.addParentHint}</p>
    </section>
  );
}
