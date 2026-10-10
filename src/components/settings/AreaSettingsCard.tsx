import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseAreaSettings } from '../../hooks/useAreaSettings';
import type { AreaWithDomains } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Chip } from '../ui/Chip';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { InlineEdit } from '../ui/InlineEdit';

type AreaSettingsCardProps = {
  readonly area: AreaWithDomains;
  readonly toneClass: string;
  readonly settings: UseAreaSettings;
};

/** One area with its domains: rename, mark private, delete, and add a domain. */
export function AreaSettingsCard({ area, toneClass, settings }: AreaSettingsCardProps): ReactElement {
  const areaIsPrivate = area.visibility === 'private';

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`size-3 shrink-0 rounded-full ${toneClass}`} />
        <InlineEdit
          value={area.name}
          textClass="font-display text-lg font-bold"
          onSave={(name) => {
            settings.renameArea(area, name);
          }}
        />
        <Chip
          label={labels.actions.makePrivate}
          selected={areaIsPrivate}
          onClick={() => {
            settings.setAreaPrivate(area, !areaIsPrivate);
          }}
        />
        <ConfirmIconButton
          label={labels.actions.delete}
          confirmLabel={labels.actions.confirmDelete}
          onConfirm={() => {
            settings.removeArea(area);
          }}
        />
      </div>
      {areaIsPrivate && <p className="text-sm text-muted">{labels.settings.privateAreaHint}</p>}
      <ul className="flex flex-col divide-y divide-line">
        {area.domains.map((domain) => (
          <li key={domain.id} className="flex items-center gap-2 py-1">
            <InlineEdit
              value={domain.name}
              onSave={(name) => {
                settings.renameDomain(domain, name);
              }}
            />
            {!areaIsPrivate && (
              <Chip
                label={labels.actions.makePrivate}
                selected={domain.visibility === 'private'}
                onClick={() => {
                  settings.setDomainPrivate(domain, domain.visibility !== 'private');
                }}
              />
            )}
            <ConfirmIconButton
              label={labels.actions.delete}
              confirmLabel={labels.actions.confirmDelete}
              onConfirm={() => {
                settings.removeDomain(domain);
              }}
            />
          </li>
        ))}
      </ul>
      <AddRow
        label={labels.fields.newDomain}
        onAdd={(name) => {
          settings.addDomain(area, name);
        }}
      />
    </section>
  );
}
