import { useRef } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone, groupEntities } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type ScopeBarProps = {
  readonly entities: readonly (Entity & { readonly avatarUrl?: string | null })[];
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly onChange: (entityId: string | null) => void;
  /** Open rows per entity id; left out where counts would not match the page. */
  readonly counts?: ReadonlyMap<string, number> | undefined;
};

/** How far from the middle the pictures sit, one and two places away, in pixels. */
const offsets = [0, 92, 154] as const;
/** How far a finger has to move to turn to the next one. */
const swipeDistance = 40;

/**
 * Who the tabs are showing, as a row of pictures: the chosen one large in the middle,
 * its neighbours smaller on each side. Tapping a neighbour, the arrows or a swipe moves
 * to it. "Everything" comes first; the choice narrows every tab until it is changed.
 */
export function ScopeBar({ entities, scopeId, onChange, counts }: ScopeBarProps): ReactElement {
  const ordered = groupEntities(entities).flatMap((group) => group.entities);
  const options: readonly (string | null)[] = [null, ...ordered.map((entity) => entity.id)];
  const found = options.indexOf(scopeId);
  const index = found === -1 ? 0 : found;
  const scope = ordered.find((entity) => entity.id === scopeId);
  const touchStart = useRef<number | null>(null);

  function go(next: number): void {
    const target = options[Math.max(0, Math.min(options.length - 1, next))];
    if (target !== undefined && next !== index) {
      onChange(target);
    }
  }

  const count = scope === undefined ? 0 : (counts?.get(scope.id) ?? 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative -mx-4 h-[116px] w-[calc(100%+2rem)] touch-pan-y overflow-hidden"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (start === null || end === undefined) {
            return;
          }
          // Right to left: the next one waits on the left, so a swipe to the right brings it.
          if (end - start > swipeDistance) {
            go(index + 1);
          } else if (start - end > swipeDistance) {
            go(index - 1);
          }
        }}
      >
        {options.map((option, position) => {
          const distance = position - index;
          const away = Math.abs(distance);
          if (away > 2) {
            return null;
          }
          const entity = ordered.find((candidate) => candidate.id === option);
          const scale = away === 0 ? 1 : away === 1 ? 0.62 : 0.42;
          return (
            <button
              key={option ?? 'all'}
              type="button"
              aria-pressed={away === 0}
              aria-label={entity?.name ?? labels.entityPage.everything}
              tabIndex={away === 0 ? -1 : 0}
              onClick={() => {
                go(position);
              }}
              className="absolute top-1/2 left-1/2 rounded-full transition-[transform,opacity] duration-300 ease-out"
              style={{
                transform: `translate(calc(-50% + ${String(-Math.sign(distance) * (offsets[away] ?? 0))}px), -50%) scale(${String(scale)})`,
                opacity: away === 0 ? 1 : away === 1 ? 0.85 : 0.35,
                zIndex: 10 - away,
              }}
            >
              <span
                className={`block rounded-full bg-surface p-1 ${away === 0 ? 'shadow-raised' : 'shadow-card'}`}
              >
                {entity === undefined ? (
                  <span className="flex size-24 items-center justify-center rounded-full bg-primary text-white">
                    <Icon name="home" className="size-10" />
                  </span>
                ) : (
                  <EntityAvatar
                    entity={entity}
                    tone={entityTone(entities.indexOf(entity))}
                    size="hero"
                  />
                )}
              </span>
            </button>
          );
        })}
        {index < options.length - 1 && (
          <button
            type="button"
            aria-label={labels.tour.next}
            onClick={() => {
              go(index + 1);
            }}
            className="absolute top-1/2 left-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-muted shadow-card active:bg-line"
          >
            <Icon name="forward" className="size-6" />
          </button>
        )}
        {index > 0 && (
          <button
            type="button"
            aria-label={labels.tour.back}
            onClick={() => {
              go(index - 1);
            }}
            className="absolute top-1/2 right-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-muted shadow-card active:bg-line"
          >
            <Icon name="back" className="size-6" />
          </button>
        )}
      </div>

      <div key={scopeId ?? 'all'} className="flex animate-fade-in flex-col items-center gap-2">
        <div className="flex flex-col items-center">
          <span className="font-display text-xl font-bold">
            {scope?.name ?? labels.entityPage.everything}
          </span>
          <span className="text-[13px] text-muted">
            {scope === undefined
              ? labels.scope.everythingHint
              : `${labels.entityKind[scope.kind]}${
                  count > 0
                    ? `${labels.item.separator}${String(count)} ${labels.entityPage.openItems}`
                    : ''
                }`}
          </span>
        </div>
        {scope !== undefined && (
          <Link
            to={`/entity/${scope.id}`}
            className="flex h-9 items-center gap-1 rounded-full bg-primary-soft px-4 text-[13px] font-semibold text-primary transition active:scale-95"
          >
            {labels.scope.byDomain}
            <Icon name="forward" className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
