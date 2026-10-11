import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseEntitySettings } from '../../hooks/useEntitySettings';
import { entityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { ErrorBanner } from '../ui/ErrorBanner';
import { EntitySettingsCard } from './EntitySettingsCard';

type EntitySettingsProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly settings: UseEntitySettings;
};

/** Every entity in one list; each opens in place to edit its domains. */
export function EntitySettings({ entities, settings }: EntitySettingsProps): ReactElement {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.sections.entities}
      </h2>
      <ErrorBanner message={settings.error} />
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {entities.map((entity, index) => (
          <EntitySettingsCard
            key={entity.id}
            entity={entity}
            tone={entityTone(index)}
            settings={settings}
          />
        ))}
      </ul>
    </section>
  );
}
