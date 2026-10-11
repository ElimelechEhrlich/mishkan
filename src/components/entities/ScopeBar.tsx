import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone, groupEntities } from '../../lib/lookups';
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

const chipClass =
  'flex h-9 shrink-0 items-center gap-1.5 rounded-full ps-1 pe-3 text-[13px] font-medium transition active:scale-95';

/**
 * The entities at the top of every tab, in their groups. Choosing one narrows all the
 * tabs to it until "everything" is chosen again. A grid button opens all of them at once;
 * the chosen one shows as a band in its color, with its page by domain and a way back.
 */
export function ScopeBar({ entities, scopeId, onChange, counts }: ScopeBarProps): ReactElement {
  const scope = entities.find((entity) => entity.id === scopeId);
  const scopeIndex = scope === undefined ? -1 : entities.indexOf(scope);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keeps the chosen chip in view, also when the page opens with it already chosen.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [scope?.id]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative -mx-4 flex items-center">
        <button
          type="button"
          aria-label={labels.scope.allEntities}
          onClick={() => {
            setSheetOpen(true);
          }}
          className="z-10 ms-4 me-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card transition active:scale-95"
        >
          <Icon name="grid" className="size-4" />
        </button>
        <nav
          aria-label={labels.sections.entities}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 ps-1 pe-4 [mask-image:linear-gradient(to_left,black_calc(100%-24px),transparent)] [scrollbar-width:none]"
        >
          <button
            type="button"
            ref={scope === undefined ? selectedRef : undefined}
            aria-pressed={scope === undefined}
            onClick={() => {
              onChange(null);
            }}
            className={`${chipClass} ${scope === undefined ? 'bg-primary text-white' : 'bg-surface shadow-card'}`}
          >
            <span
              className={`flex size-7 items-center justify-center rounded-full ${
                scope === undefined ? 'bg-white/15' : 'bg-primary text-white'
              }`}
            >
              <Icon name="home" className="size-3.5" />
            </span>
            {labels.entityPage.everything}
          </button>
          {groupEntities(entities).map((group) => (
            <Fragment key={group.key}>
              <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-line" />
              {group.entities.map((entity) => {
                const selected = entity.id === scope?.id;
                const count = counts?.get(entity.id) ?? 0;
                return (
                  <button
                    key={entity.id}
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(selected ? null : entity.id);
                    }}
                    className={`${chipClass} ${selected ? 'bg-ink text-white' : 'bg-surface shadow-card'}`}
                  >
                    <EntityAvatar
                      entity={entity}
                      tone={entityTone(entities.indexOf(entity))}
                      size="xs"
                    />
                    {entity.name}
                    {count > 0 && (
                      <span className={`text-xs ${selected ? 'text-white/70' : 'text-muted'}`}>
                        {String(count)}
                      </span>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </nav>
      </div>

      {scope !== undefined && (
        <div
          className={`flex animate-fade-in items-center gap-2 rounded-2xl border-s-4 bg-surface py-1.5 ps-3 pe-1.5 shadow-card ${entityTone(scopeIndex).border}`}
        >
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
            {labels.scope.showingOnly} <span className="font-semibold text-ink">{scope.name}</span>
          </span>
          <Link
            to={`/entity/${scope.id}`}
            className="flex h-8 items-center gap-0.5 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-semibold text-primary transition active:scale-95"
          >
            {labels.scope.byDomain}
            <Icon name="forward" className="size-4" />
          </Link>
          <button
            type="button"
            aria-label={labels.scope.clear}
            onClick={() => {
              onChange(null);
            }}
            className="flex size-8 items-center justify-center rounded-full text-muted transition active:bg-line"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

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
    </div>
  );
}
