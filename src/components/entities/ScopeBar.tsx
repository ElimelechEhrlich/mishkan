import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import {
  carouselReach,
  entityTone,
  everythingReach,
  groupEntities,
  mainCircle,
  scopeOptions,
  swipeSteps,
} from '../../lib/lookups';
import { everythingFlight, flyWhile } from '../../lib/flight';
import type { EntityWithDomains } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntitySheet } from './EntitySheet';
import { EntityAvatar } from './EntityAvatar';

type ScopeBarProps = {
  readonly entities: readonly EntityWithDomains[];
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly onChange: (entityId: string | null) => void;
  /** Open rows per entity id; left out where counts would not match the page. */
  readonly counts?: ReadonlyMap<string, number> | undefined;
  /** Reloads the entities after a change made from the chosen entity's sheet. */
  readonly onEntityChanged: () => Promise<void>;
};

/** How far from the middle the pictures sit, one and two places away, in pixels. */
const offsets = [0, 92, 154] as const;

/**
 * Who the tabs are showing, as a row of pictures: the chosen one large in the middle,
 * its neighbours smaller on each side. Tapping a neighbour, the arrows or a swipe moves
 * to it. "Everything" comes first; the choice narrows every tab until it is changed.
 */
export function ScopeBar({
  entities,
  scopeId,
  onChange,
  counts,
  onEntityChanged,
}: ScopeBarProps): ReactElement {
  const ordered = groupEntities(entities).flatMap((group) => group.entities);
  const options = scopeOptions(entities);
  const found = options.indexOf(scopeId);
  const index = found === -1 ? 0 : found;
  const scope = ordered.find((entity) => entity.id === scopeId);
  const touchStart = useRef<{ readonly x: number; readonly at: number } | null>(null);
  const circle = mainCircle(entities);
  const [sheetOpen, setSheetOpen] = useState(false);
  const canOpenSheet = scope !== undefined;

  function go(next: number): void {
    const target = options[Math.max(0, Math.min(options.length - 1, next))];
    if (target === undefined || next === index) {
      return;
    }
    // When "everything" moves between the carousel and the header, it is seen flying there.
    if (index > everythingReach !== next > everythingReach) {
      flyWhile(everythingFlight, () => {
        onChange(target);
      });
    } else {
      onChange(target);
    }
  }

  const count = scope === undefined ? 0 : (counts?.get(scope.id) ?? 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative -mx-4 h-[116px] w-[calc(100%+2rem)] touch-pan-y"
        onTouchStart={(event) => {
          const x = event.touches[0]?.clientX;
          touchStart.current = x === undefined ? null : { x, at: event.timeStamp };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (start === null || end === undefined) {
            return;
          }
          // A faster or longer swipe turns more places. Right to left: the next one waits on
          // the left, so a swipe to the right brings it.
          const moved = end - start.x;
          const steps = swipeSteps(moved, event.timeStamp - start.at);
          if (steps > 0) {
            go(index + (moved > 0 ? steps : -steps));
          }
        }}
      >
        {options.map((option, position) => {
          const distance = position - index;
          const away = Math.abs(distance);
          if (away > carouselReach || (option === null && away > everythingReach)) {
            return null;
          }
          const entity = ordered.find((candidate) => candidate.id === option);
          const scale = away === 0 ? 1 : away === 1 ? 0.62 : 0.42;
          return (
            <button
              key={option ?? 'all'}
              type="button"
              data-flight={option === null ? everythingFlight : undefined}
              aria-pressed={away === 0}
              aria-label={
                away === 0 && canOpenSheet
                  ? labels.scope.openEntity
                  : (entity?.name ?? labels.entityPage.everything)
              }
              tabIndex={away === 0 && !canOpenSheet ? -1 : 0}
              onClick={() => {
                if (away === 0) {
                  setSheetOpen(canOpenSheet);
                } else {
                  go(position);
                }
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
              {away === 0 && canOpenSheet && (
                <span className="absolute end-1 bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-paper bg-surface text-muted shadow-card">
                  <Icon name="user" className="size-4" />
                </span>
              )}
            </button>
          );
        })}
        {circle !== undefined && (
          <button
            type="button"
            aria-label={labels.scope.openCircle}
            aria-pressed={circle.id === scopeId}
            onClick={() => {
              go(circle.id === scopeId ? 0 : options.indexOf(circle.id));
            }}
            className={`absolute top-0 left-3 z-20 flex size-9 items-center justify-center rounded-full shadow-card transition active:scale-90 ${
              circle.id === scopeId ? 'bg-primary text-white' : 'bg-surface text-muted'
            }`}
          >
            <Icon name="users" className="size-5" />
          </button>
        )}
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
      </div>
      {sheetOpen && scope !== undefined && (
        <EntitySheet
          entity={scope}
          tone={entityTone(entities.indexOf(scope))}
          onEntityChanged={onEntityChanged}
          onClose={() => {
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
