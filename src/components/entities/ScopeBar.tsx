import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';
import { ScopeSheet } from './ScopeSheet';

type ScopeBarProps = {
  readonly entities: readonly Entity[];
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly onChange: (entityId: string | null) => void;
  /** Open rows per entity id; left out where counts would not match the page. */
  readonly counts?: ReadonlyMap<string, number> | undefined;
};

/**
 * Who the tabs are showing, as one bar: the current entity (or everything) with an arrow.
 * Tapping it opens the list of entities to switch to, like choosing a family member in a
 * health fund app. The choice narrows every tab until "everything" is chosen again.
 */
export function ScopeBar({ entities, scopeId, onChange, counts }: ScopeBarProps): ReactElement {
  const scope = entities.find((entity) => entity.id === scopeId);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 rounded-2xl bg-surface p-1.5 shadow-card">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={labels.scope.chooseEntity}
          onClick={() => {
            setSheetOpen(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-start transition active:bg-paper"
        >
          {scope === undefined ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Icon name="home" className="size-5" />
            </span>
          ) : (
            <EntityAvatar entity={scope} tone={entityTone(entities.indexOf(scope))} size="md" />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] text-muted">{labels.scope.viewing}</span>
            <span className="flex items-center gap-1">
              <span className="truncate text-[16px] font-bold">
                {scope?.name ?? labels.entityPage.everything}
              </span>
              <Icon name="down" className="size-4 shrink-0 text-muted" />
            </span>
          </span>
        </button>
        {scope !== undefined && (
          <Link
            to={`/entity/${scope.id}`}
            className="flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-semibold text-primary transition active:scale-95"
          >
            {labels.scope.byDomain}
            <Icon name="forward" className="size-4" />
          </Link>
        )}
      </div>

      {sheetOpen && (
        <ScopeSheet
          entities={entities}
          scopeId={scopeId}
          counts={counts}
          onChoose={(entityId) => {
            onChange(entityId);
            setSheetOpen(false);
          }}
          onClose={() => {
            setSheetOpen(false);
          }}
        />
      )}
    </>
  );
}
