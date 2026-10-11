import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entityTone, groupEntities } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type ScopeSheetProps = {
  readonly entities: readonly Entity[];
  readonly scopeId: string | null;
  readonly counts?: ReadonlyMap<string, number> | undefined;
  readonly onChoose: (entityId: string | null) => void;
  readonly onClose: () => void;
};

const rowClass = 'flex w-full items-center gap-3 px-4 py-3 text-start transition active:bg-paper';

/**
 * The list for switching entity, like switching family member in a health fund app:
 * everything first, then each group, the current one marked with a check.
 */
export function ScopeSheet({
  entities,
  scopeId,
  counts,
  onChoose,
  onClose,
}: ScopeSheetProps): ReactElement {
  const check = <Icon name="check" className="size-5 text-primary" />;

  return (
    <div
      className="fixed inset-0 z-30 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.scope.chooseEntity}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="mx-auto flex max-h-[85dvh] w-full max-w-xl animate-sheet-up flex-col overflow-y-auto rounded-t-[28px] bg-surface pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-sheet"
      >
        <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="px-4 pt-2 pb-1 text-center font-display text-lg font-bold">
          {labels.scope.chooseEntity}
        </h2>

        <button
          type="button"
          aria-pressed={scopeId === null}
          onClick={() => {
            onChoose(null);
          }}
          className={rowClass}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Icon name="home" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[16px] font-semibold">{labels.entityPage.everything}</span>
            <span className="text-[13px] text-muted">{labels.scope.everythingHint}</span>
          </span>
          {scopeId === null && check}
        </button>

        {groupEntities(entities).map((group) => (
          <section key={group.key} className="flex flex-col">
            <h3 className="border-t border-line px-4 pt-3 pb-1 text-xs font-bold tracking-wide text-muted">
              {labels.scope.groups[group.key]}
            </h3>
            {group.entities.map((entity) => {
              const selected = entity.id === scopeId;
              const count = counts?.get(entity.id) ?? 0;
              return (
                <button
                  key={entity.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChoose(entity.id);
                  }}
                  className={`${rowClass} ${selected ? 'bg-primary-soft/60' : ''}`}
                >
                  <EntityAvatar
                    entity={entity}
                    tone={entityTone(entities.indexOf(entity))}
                    size="list"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[16px] font-semibold">{entity.name}</span>
                    <span className="text-[13px] text-muted">
                      {labels.entityKind[entity.kind]}
                      {count > 0 &&
                        `${labels.item.separator}${String(count)} ${labels.entityPage.openItems}`}
                    </span>
                  </span>
                  {selected && check}
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
