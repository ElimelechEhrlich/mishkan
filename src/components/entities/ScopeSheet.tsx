import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entityTone, groupEntities } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { EntityAvatar } from './EntityAvatar';

type ScopeSheetProps = {
  readonly entities: readonly Entity[];
  readonly scopeId: string | null;
  readonly counts?: ReadonlyMap<string, number> | undefined;
  readonly onChoose: (entityId: string | null) => void;
  readonly onClose: () => void;
};

/** Every entity at once, in its group, with big targets: for choosing without scrolling. */
export function ScopeSheet({
  entities,
  scopeId,
  counts,
  onChoose,
  onClose,
}: ScopeSheetProps): ReactElement {
  return (
    <div
      className="fixed inset-0 z-30 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.scope.allEntities}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="mx-auto flex max-h-[85dvh] w-full max-w-xl animate-sheet-up flex-col overflow-y-auto rounded-t-[28px] bg-surface px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-sheet"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{labels.scope.chooseEntity}</h2>
          <IconButton icon="close" label={labels.actions.close} onClick={onClose} />
        </div>
        <button
          type="button"
          onClick={() => {
            onChoose(null);
          }}
          className={`mt-2 flex items-center gap-3 rounded-2xl p-3 text-start transition active:scale-[0.99] ${
            scopeId === null ? 'bg-primary text-white' : 'bg-paper'
          }`}
        >
          <span
            className={`flex size-10 items-center justify-center rounded-full ${
              scopeId === null ? 'bg-white/15' : 'bg-primary text-white'
            }`}
          >
            <Icon name="home" className="size-5" />
          </span>
          <span className="text-[15px] font-semibold">{labels.entityPage.everything}</span>
        </button>
        {groupEntities(entities).map((group) => (
          <section key={group.key} className="mt-4 flex flex-col gap-2">
            <h3 className="px-1 text-xs font-bold tracking-wide text-muted">
              {labels.scope.groups[group.key]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
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
                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition active:scale-95 ${
                      selected ? 'bg-ink text-white' : 'bg-paper'
                    }`}
                  >
                    <EntityAvatar
                      entity={entity}
                      tone={entityTone(entities.indexOf(entity))}
                      size="md"
                    />
                    <span className="max-w-full truncate text-[13px] font-semibold">
                      {entity.name}
                    </span>
                    <span className={`text-[11px] ${selected ? 'text-white/70' : 'text-muted'}`}>
                      {count > 0 ? String(count) : '·'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
