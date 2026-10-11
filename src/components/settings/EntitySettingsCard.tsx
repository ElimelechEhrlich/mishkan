import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseEntitySettings } from '../../hooks/useEntitySettings';
import type { EntityWithDomains } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Button } from '../ui/Button';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';
import { InlineEdit } from '../ui/InlineEdit';

type EntitySettingsCardProps = {
  readonly entity: EntityWithDomains;
  readonly toneClass: string;
  readonly settings: UseEntitySettings;
};

/**
 * One entity, folded by default. Opened, it shows its domains with rename and delete.
 * Children and parents who have not joined can be deleted; their items move to
 * "needs completion". The shopping domain stays as long as the entity does.
 */
export function EntitySettingsCard({
  entity,
  toneClass,
  settings,
}: EntitySettingsCardProps): ReactElement {
  const [open, setOpen] = useState(false);
  const isPrivate = entity.kind === 'personal';
  const canDelete =
    entity.kind === 'child' || (entity.kind === 'parent' && entity.member_id === null);
  const canAddDebts =
    (entity.kind === 'parent' || entity.kind === 'personal') &&
    !entity.domains.some((domain) => domain.role === 'debts');

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
          <span className="truncate text-[17px] font-semibold">{entity.name}</span>
          <span className="text-[13px] text-muted">
            {labels.entityKind[entity.kind]}
            {labels.item.separator}
            {String(entity.domains.length)} {labels.settings.domainsCount}
          </span>
        </span>
        {isPrivate && <Icon name="lock" className="size-4 text-primary" />}
        <Icon
          name="down"
          className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-line px-4 pt-2 pb-4">
          <div className="flex items-center gap-1">
            <InlineEdit
              value={entity.name}
              textClass="font-semibold"
              onSave={(name) => {
                settings.renameEntity(entity, name);
              }}
            />
            {canDelete && (
              <ConfirmIconButton
                label={labels.actions.delete}
                confirmLabel={labels.settings.confirmDeleteWithItems}
                onConfirm={() => {
                  settings.removeEntity(entity);
                }}
              />
            )}
          </div>
          {isPrivate && <p className="text-sm text-muted">{labels.settings.privateEntityHint}</p>}
          <ul className="flex flex-col divide-y divide-line rounded-xl bg-paper/60 px-3">
            {entity.domains.map((domain) => (
              <li key={domain.id} className="flex items-center gap-1 py-1">
                <InlineEdit
                  value={domain.name}
                  textClass=""
                  onSave={(name) => {
                    settings.renameDomain(domain, name);
                  }}
                />
                {domain.role !== 'shopping' && (
                  <ConfirmIconButton
                    label={labels.actions.delete}
                    confirmLabel={labels.settings.confirmDeleteWithItems}
                    onConfirm={() => {
                      settings.removeDomain(domain);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          <AddRow
            label={labels.fields.newDomain}
            onAdd={(name) => {
              settings.addDomain(entity, name);
            }}
          />
          {canAddDebts && (
            <Button
              variant="ghost"
              onClick={() => {
                settings.addDebtsDomain(entity, labels.settings.debtsDomainName);
              }}
            >
              {labels.settings.addDebtsDomain}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
