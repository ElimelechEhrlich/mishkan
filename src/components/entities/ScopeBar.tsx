import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type ScopeBarProps = {
  readonly entities: readonly Entity[];
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly onChange: (entityId: string | null) => void;
  /** Open rows per entity id; left out where counts would not match the page. */
  readonly counts?: ReadonlyMap<string, number> | undefined;
};

const chipClass =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-full ps-1 pe-3 text-[13px] font-medium transition active:scale-95';

/**
 * The entity chips at the top of every tab. Choosing one narrows all the tabs to it
 * until "everything" is chosen again; the chosen one also links to its page by domain.
 */
export function ScopeBar({ entities, scopeId, onChange, counts }: ScopeBarProps): ReactElement {
  const scope = entities.find((entity) => entity.id === scopeId);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Keeps the chosen chip in view, also when the page opens with it already chosen.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [scope?.id]);

  return (
    <div className="flex flex-col gap-2">
      <nav
        aria-label={labels.sections.entities}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none]"
      >
        <button
          type="button"
          aria-pressed={scope === undefined}
          onClick={() => {
            onChange(null);
          }}
          className={`${chipClass} ${scope === undefined ? 'bg-primary text-white' : 'bg-surface shadow-card'}`}
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full ${
              scope === undefined ? 'bg-white/15' : 'bg-primary text-white'
            }`}
          >
            <Icon name="home" className="size-3.5" />
          </span>
          {labels.entityPage.everything}
        </button>
        {entities.map((entity, index) => {
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
              <EntityAvatar entity={entity} tone={entityTone(index)} size="xs" />
              {entity.name}
              {count > 0 && (
                <span className={`text-xs ${selected ? 'text-white/70' : 'text-muted'}`}>
                  {String(count)}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {scope !== undefined && (
        <Link
          to={`/entity/${scope.id}`}
          className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5 text-[13px] shadow-card transition active:scale-[0.99]"
        >
          <span className="text-muted">
            {labels.scope.showingOnly}{' '}
            <span className="font-semibold text-ink">{scope.name}</span>
          </span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            {labels.scope.byDomain}
            <Icon name="forward" className="size-4" />
          </span>
        </Link>
      )}
    </div>
  );
}
