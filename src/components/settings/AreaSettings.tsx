import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useAreaSettings } from '../../hooks/useAreaSettings';
import { areaTone } from '../../lib/lookups';
import type { AreaWithDomains, Member } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { ErrorBanner } from '../ui/ErrorBanner';
import { AreaSettingsCard } from './AreaSettingsCard';

type AreaSettingsProps = {
  readonly member: Member;
  readonly areas: readonly AreaWithDomains[];
  readonly reload: () => Promise<void>;
};

export function AreaSettings({ member, areas, reload }: AreaSettingsProps): ReactElement {
  const settings = useAreaSettings(member, areas, reload);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 font-display text-lg font-bold">{labels.sections.areas}</h2>
      <ErrorBanner message={settings.error} />
      {areas.map((area, index) => (
        <AreaSettingsCard
          key={area.id}
          area={area}
          toneClass={areaTone(index)}
          settings={settings}
        />
      ))}
      <AddRow label={labels.fields.newArea} onAdd={settings.addArea} />
    </section>
  );
}
