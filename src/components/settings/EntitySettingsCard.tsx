import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { UseEntitySettings } from '../../hooks/useEntitySettings';
import type { EntityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { EntityAvatar } from '../entities/EntityAvatar';
import { AddRow } from '../ui/AddRow';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';
import { InlineEdit } from '../ui/InlineEdit';

type EntitySettingsCardProps = {
  readonly entity: EntityWithDomains;
  readonly tone: EntityTone;
  readonly settings: UseEntitySettings;
  /** The home: one per household, drawn larger with a house. */
  readonly featured?: boolean;
};

/**
 * One entity in the settings list, folded by default, with a way to its page. Opened, it shows its domains with
 * rename and delete. Children and parents who have not joined can be deleted; their items
 * move to "needs completion". The shopping domain stays as long as the entity does.
 */
export function EntitySettingsCard({
  entity,
  tone,
  settings,
  featured = false,
}: EntitySettingsCardProps): ReactElement {
  const [open, setOpen] = useState(false);
  const isPrivate = entity.kind === 'personal';
  const canDelete =
    entity.kind === 'child' ||
    entity.kind === 'circle' ||
    (entity.kind === 'parent' && entity.member_id === null);
  const canAddDebts =
    (entity.kind === 'parent' || entity.kind === 'personal') &&
    !entity.domains.some((domain) => domain.role === 'debts');

  return (
    <li className={featured ? 'group bg-primary-soft/50' : 'group'}>
      <div className="flex items-stretch">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 ps-3.5 text-start active:bg-paper"
        >
          {featured ? (
            <span className="my-3 flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-white">
              <Icon name="home" className="size-6" />
            </span>
          ) : (
            <EntityAvatar entity={entity} tone={tone} size="md" />
          )}
          <span className="flex min-w-0 flex-1 items-center gap-3 border-t border-line py-2.5 pe-2 group-first:border-t-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={
                  featured
                    ? 'truncate font-display text-lg font-bold'
                    : 'truncate text-[15px] font-medium'
                }
              >
                {entity.name}
              </span>
              <span className="text-xs text-muted">
                {labels.entityKind[entity.kind]}
                {labels.item.separator}
                {String(entity.domains.length)} {labels.settings.domainsCount}
              </span>
            </span>
            <Icon
              name="down"
              className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
        <span className="flex items-center border-t border-line pe-2 group-first:border-t-0">
          <Link
            to={`/entity/${entity.id}`}
            aria-label={`${labels.settings.openEntityPage} ${entity.name}`}
            className="flex h-9 items-center gap-0.5 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-semibold text-primary transition active:scale-95"
          >
            {labels.settings.entityPage}
            <Icon name="forward" className="size-4" />
          </Link>
        </span>
      </div>

      {open && (
        <div className="flex flex-col gap-3 bg-paper/60 px-3.5 pt-2 pb-4">
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
          {isPrivate && (
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="lock" className="size-3.5" />
              {labels.settings.privateEntityHint}
            </p>
          )}
          <ul className="overflow-hidden rounded-xl bg-surface shadow-card">
            {entity.domains.map((domain) => (
              <li
                key={domain.id}
                className="flex items-center gap-1 border-t border-line ps-3.5 pe-1 first:border-t-0"
              >
                <InlineEdit
                  value={domain.name}
                  textClass="text-[15px]"
                  onSave={(name) => {
                    settings.renameDomain(domain, name);
                  }}
                />
                {domain.role === 'shopping' ? (
                  <span className="flex size-10 items-center justify-center text-faint">
                    <Icon name="cart" className="size-4" />
                  </span>
                ) : (
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
            <button
              type="button"
              onClick={() => {
                settings.addDebtsDomain(entity, labels.settings.debtsDomainName);
              }}
              className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary"
            >
              <Icon name="wallet" className="size-4" />
              {labels.settings.addDebtsDomain}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
