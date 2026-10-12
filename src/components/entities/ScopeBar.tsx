import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import {
  awayAtOffset,
  carouselPlace,
  carouselReach,
  entityTone,
  everythingReach,
  glideTarget,
  groupEntities,
  mainCircle,
  scopeOptions,
} from '../../lib/lookups';
import { everythingFlight, flyDownAndOn, flyWhile } from '../../lib/flight';
import { setEverythingUp, useEverythingUp } from '../../hooks/useEverythingUp';
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

/**
 * Where, while the carousel turns, "everything" leaves for the header and comes back: half
 * way past its last place. It always takes off from and lands on this very spot.
 */
const gate = everythingReach + 0.5;

/** The shortest and longest a glide to rest takes, in milliseconds. */
const glideShortest = 260;
const glideLongest = 900;

/** How far the finger moves the carousel by one place, in pixels. */
const stepWidth = 80;
/** The finger's speed is taken from its last moves, this long back, in milliseconds. */
const speedWindow = 100;
/** Past either end the carousel follows the finger only this much, and springs back. */
const edgePull = 0.3;
/** A finger that moved less than this, in pixels, is still a tap. */
const tapSlop = 8;

type Touch = {
  readonly x: number;
  readonly y: number;
  readonly from: number;
  /** Whether the finger moves sideways (turning the carousel) or up and down; null until known. */
  sideways: boolean | null;
  samples: { readonly x: number; readonly at: number }[];
};

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
  const touch = useRef<Touch | null>(null);
  /** Where the carousel is while a finger moves it or it glides on, in places; null at rest. */
  const [moving, setMoving] = useState<number | null>(null);
  const movingRef = useRef<number | null>(null);
  const frame = useRef(0);
  /** Set when a finger turned the carousel, so the tap that ends it opens nothing. */
  const swiped = useRef(false);
  const circle = mainCircle(entities);
  const [sheetOpen, setSheetOpen] = useState(false);
  const everythingUp = useEverythingUp();
  /** Where "everything" is: in the header past its reach, or in the carousel. */
  const up = everythingUp ?? index > everythingReach;
  const upRef = useRef(up);
  upRef.current = up;
  /**
   * While coming back down as the carousel turns: how many places from the middle
   * "everything" is drawn, apart from the carousel. It lands where it left (the gate) and
   * goes on along the carousel to its own place; null when it moves with the carousel.
   */
  const [held, setHeld] = useState<number | null>(null);
  const heldRef = useRef<number | null>(null);
  /** A place the carousel came to rest on, waiting for "everything" to get home first. */
  const pending = useRef<number | null>(null);
  /** Stops the way down while it is still going. */
  const stopLanding = useRef<() => void>(() => undefined);
  /** Where the carousel rests, for the way down that runs between renders. */
  const indexRef = useRef(index);
  indexRef.current = index;

  function hold(away: number | null): void {
    heldRef.current = away;
    setHeld(away);
  }
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

  useEffect(() => {
    return (): void => {
      cancelAnimationFrame(frame.current);
      stopLanding.current();
      setEverythingUp(null);
    };
  }, []);

  function moveTo(position: number): void {
    movingRef.current = position;
    // "Everything" goes up to the header, or comes back down, just as the carousel passes
    // the gate, on the carousel's own pace and always on the same arc.
    const nowUp = position > gate;
    if (nowUp === upRef.current) {
      setMoving(position);
      return;
    }
    upRef.current = nowUp;
    stopLanding.current();
    if (nowUp) {
      // Drawn at the gate first, so it takes off from there however fast the carousel turns.
      flushSync(() => {
        hold(null);
        setMoving(position);
      });
      flyWhile(everythingFlight, () => {
        setEverythingUp(true);
      });
      return;
    }
    // Down the arc it went up, and on along the carousel to its own place, in one move.
    const gateOffset = carouselPlace(gate).offset;
    stopLanding.current = flyDownAndOn(
      everythingFlight,
      () => {
        setMoving(position);
        setEverythingUp(false);
        hold(gate);
      },
      {
        length: () => {
          const place = Math.max(0, Math.min(gate, movingRef.current ?? indexRef.current));
          return gateOffset - carouselPlace(place).offset;
        },
        moveTo: (pixels) => {
          hold(awayAtOffset(gateOffset - pixels));
        },
        done: () => {
          hold(null);
          // The carousel came to rest while it was still on its way: now it can be chosen.
          if (pending.current !== null) {
            choose(pending.current);
          }
        },
      },
    );
  }

  /**
   * Comes to rest on a place. It becomes the choice, and the page below is drawn for it, only
   * once nothing moves any more ("everything" may still be on its way down), so drawing the
   * page never holds up a frame of the motion.
   */
  function settle(next: number): void {
    cancelAnimationFrame(frame.current);
    moveTo(next);
    if (heldRef.current === null) {
      choose(next);
    } else {
      pending.current = next;
    }
  }

  function choose(next: number): void {
    pending.current = null;
    movingRef.current = null;
    const target = options[next];
    setMoving(null);
    setEverythingUp(null);
    if (target !== undefined && next !== index) {
      onChange(target);
    }
  }

  /**
   * Lets the carousel go on from where the finger left it, at the finger's speed, slowing
   * down to stand still exactly on a place, without a long crawl at the end.
   */
  function glide(from: number, speed: number, origin: number): void {
    const target = glideTarget(from, speed, origin, options.length);
    const distance = target - from;
    // Easing out on a cubic starts at three times the average speed; matching it to the
    // finger's sets how long the way takes.
    const toward = Math.abs(speed) > 0 && Math.sign(speed) === Math.sign(distance);
    const duration = Math.max(
      glideShortest,
      Math.min(glideLongest, toward ? (3 * Math.abs(distance)) / Math.abs(speed) : glideShortest),
    );
    const start = performance.now();
    const tick = (now: number): void => {
      const time = Math.min(1, (now - start) / duration);
      if (time >= 1) {
        settle(target);
        return;
      }
      moveTo(from + distance * (1 - (1 - time) ** 3));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  // While the carousel turns, the name below follows the picture nearest the middle.
  const nearest =
    moving === null
      ? scopeId
      : options[Math.max(0, Math.min(options.length - 1, Math.round(moving)))];
  const shown = ordered.find((entity) => entity.id === nearest);
  const count = shown === undefined ? 0 : (counts?.get(shown.id) ?? 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative -mx-4 h-[116px] w-[calc(100%+2rem)] touch-pan-y overflow-x-clip"
        onTouchStart={(event) => {
          const finger = event.touches[0];
          // A finger on a gliding carousel catches it where it is.
          cancelAnimationFrame(frame.current);
          pending.current = null;
          swiped.current = movingRef.current !== null;
          touch.current =
            finger === undefined
              ? null
              : {
                  x: finger.clientX,
                  y: finger.clientY,
                  from: movingRef.current ?? index,
                  sideways: null,
                  samples: [{ x: finger.clientX, at: event.timeStamp }],
                };
        }}
        onTouchMove={(event) => {
          const current = touch.current;
          const finger = event.touches[0];
          if (current === null || finger === undefined) {
            return;
          }
          const dx = finger.clientX - current.x;
          if (current.sideways === null) {
            const dy = finger.clientY - current.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < tapSlop) {
              return;
            }
            current.sideways = Math.abs(dx) > Math.abs(dy);
          }
          if (!current.sideways) {
            return;
          }
          swiped.current = true;
          current.samples = [
            ...current.samples.filter((sample) => event.timeStamp - sample.at <= speedWindow),
            { x: finger.clientX, at: event.timeStamp },
          ];
          // Right to left: the next one waits on the left, so moving the finger right brings it.
          const position = current.from + dx / stepWidth;
          const last = options.length - 1;
          moveTo(
            position < 0
              ? position * edgePull
              : position > last
                ? last + (position - last) * edgePull
                : position,
          );
        }}
        onTouchEnd={(event) => {
          const current = touch.current;
          touch.current = null;
          const position = movingRef.current;
          if (current === null || position === null) {
            return;
          }
          const first = current.samples[0];
          const latest = current.samples[current.samples.length - 1];
          // A finger that stopped before it let go throws nothing.
          const speed =
            current.sideways !== true ||
            first === undefined ||
            latest === undefined ||
            latest.at === first.at ||
            event.timeStamp - latest.at > speedWindow
              ? 0
              : (latest.x - first.x) / (latest.at - first.at) / stepWidth;
          glide(position, speed, current.from);
        }}
      >
        {options.map((option, position) => {
          const isAll = option === null;
          let distance = position - (moving ?? index);
          if (isAll && held !== null) {
            distance = -held;
          } else if (isAll && moving !== null) {
            // While the carousel turns away from it, it goes no further than the gate.
            distance = Math.max(distance, -gate);
          }
          const away = Math.abs(distance);
          // "Everything" waits in the header once the carousel is past it.
          const hidden = isAll ? up : away > carouselReach + (moving === null ? 0 : 1);
          if (hidden) {
            return null;
          }
          const entity = ordered.find((candidate) => candidate.id === option);
          const place = carouselPlace(away);
          const middle = away < 0.5;
          return (
            <button
              key={option ?? 'all'}
              type="button"
              data-flight={option === null ? everythingFlight : undefined}
              aria-pressed={position === index}
              aria-label={
                position === index && canOpenSheet
                  ? labels.scope.openEntity
                  : (entity?.name ?? labels.entityPage.everything)
              }
              tabIndex={position === index && !canOpenSheet ? -1 : 0}
              onClick={() => {
                if (swiped.current) {
                  swiped.current = false;
                } else if (position === index) {
                  setSheetOpen(canOpenSheet);
                } else {
                  go(position);
                }
              }}
              className={`absolute top-1/2 left-1/2 rounded-full ${
                moving === null && !(isAll && held !== null)
                  ? 'transition-[transform,opacity] duration-300 ease-out'
                  : ''
              }`}
              style={{
                transform: `translate(calc(-50% + ${String(-Math.sign(distance) * place.offset)}px), -50%) scale(${String(place.scale)})`,
                opacity: place.opacity,
                zIndex: 10 - Math.round(away),
              }}
            >
              <span
                className={`block rounded-full bg-surface p-1 ${middle ? 'shadow-raised' : 'shadow-card'}`}
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
              {position === index && moving === null && canOpenSheet && (
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
            {shown?.name ?? labels.entityPage.everything}
          </span>
          <span className="text-[13px] text-muted">
            {shown === undefined
              ? labels.scope.everythingHint
              : `${labels.entityKind[shown.kind]}${
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
