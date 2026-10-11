import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseAreaSettings } from '../../hooks/useAreaSettings';
import type { AreaWithDomains } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { InlineEdit } from '../ui/InlineEdit';

type AreaSettingsCardProps = {
  readonly area: AreaWithDomains;
  readonly toneClass: string;
  readonly settings: UseAreaSettings;
};

/**
 * One area, folded by default. Opened, it shows its domains with rename,
 * a lock that makes them private, and delete.
 */
export function AreaSettingsCard({ area, toneClass, settings }: AreaSettingsCardProps): ReactElement {
  const [open, setOpen] = useState(false);
  const areaIsPrivate = area.visibility === 'private';

  return (
    <section className="rounded-2xl bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex min-h-16 w-full items-center gap-3 px-4 text-start"
      >
        <span className={`size-3 shrink-0 rounded-full ${toneClass}`} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[17px] font-semibold">{area.name}</span>
          <span className="text-[13px] text-muted">
            {String(area.domains.length)} {labels.settings.domainsCount}
          </span>
        </span>
        {areaIsPrivate && <Icon name="lock" className="size-4 text-primary" />}
        <Icon
          name="down"
          className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-line px-4 pt-2 pb-4">
          <div className="flex items-center gap-1">
            <InlineEdit
              value={area.name}
              textClass="font-semibold"
              onSave={(name) => {
                settings.renameArea(area, name);
              }}
            />
            <IconButton
              icon="lock"
              label={labels.actions.makePrivate}
              pressed={areaIsPrivate}
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
          <ul className="flex flex-col divide-y divide-line rounded-xl bg-paper/60 px-3">
            {area.domains.map((domain) => (
              <li key={domain.id} className="flex items-center gap-1 py-1">
                <InlineEdit
                  value={domain.name}
                  textClass=""
                  onSave={(name) => {
                    settings.renameDomain(domain, name);
                  }}
                />
                {!areaIsPrivate && (
                  <IconButton
                    icon="lock"
                    label={labels.actions.makePrivate}
                    pressed={domain.visibility === 'private'}
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
        </div>
      )}
    </section>
  );
}
