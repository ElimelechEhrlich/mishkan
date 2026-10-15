import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';

/** How far the finger moves the carousel by one place, in pixels. */
const stepWidth = 80;
/** The finger's speed is taken from its last moves, this long back, in milliseconds. */
const speedWindow = 100;
/** Past either end the carousel follows the finger only this much, and springs back. */
const edgePull = 0.3;
/** A finger that moved less than this, in pixels, is still a tap. */
const tapSlop = 8;

/** How the carousel moves; the finger only says where to. */
export type CarouselMotion = {
  /** How many places there are. */
  readonly places: number;
  /** The place it rests on. */
  readonly rest: number;
  /** Where it is between places now; null at rest. */
  readonly position: () => number | null;
  /** Stops a glide where it is, and says where that is; null at rest. */
  readonly catchAt: () => number | null;
  readonly moveTo: (position: number) => void;
  /** Goes on from `from` at `speed` (places per millisecond) to rest on a place. */
  readonly glide: (from: number, speed: number, origin: number) => void;
  /** Stands at once on the place nearest to where it is, if it is between places. */
  readonly settleNearest: () => void;
};

type Finger = {
  readonly x: number;
  readonly y: number;
  readonly from: number;
  /** Whether the finger moves sideways (turning the carousel) or up and down; null until known. */
  sideways: boolean | null;
  samples: { readonly x: number; readonly at: number }[];
};

export type CarouselTouch = {
  readonly handlers: {
    readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
    readonly onTouchMove: (event: TouchEvent<HTMLElement>) => void;
    readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
    readonly onTouchCancel: () => void;
  };
  /**
   * The picture the finger went down on (its `data-option`), while the finger is still down.
   * The carousel keeps it in the page, out of sight, even when it leaves the carousel (as
   * "everything" flying up to the header): a touch whose element is taken out of the page
   * stops reaching the carousel, which would then stand still half way.
   */
  readonly touched: string | null;
  /** Whether the tap that ends a swipe should open nothing; asking clears it. */
  readonly takeSwipe: () => boolean;
};

/**
 * Turning the carousel with a finger: sideways moves turn it, up and down moves the page.
 * One rule keeps it from being caught half way: whenever the page is moved, or the touch is
 * cut off (a screenshot, a call), the finger lets go and the carousel stands at once on the
 * nearest place. While the page is scrolled it does not start to turn at all.
 */
export function useCarouselTouch(motion: CarouselMotion): CarouselTouch {
  const finger = useRef<Finger | null>(null);
  const [touched, setTouched] = useState<string | null>(null);
  /** Set when a finger turned the carousel, so the tap that ends it opens nothing. */
  const swiped = useRef(false);
  const motionRef = useRef(motion);
  motionRef.current = motion;

  function letGo(): void {
    finger.current = null;
    motionRef.current.settleNearest();
  }

  // The page moving, even part way while the chosen picture goes up into the header, ends
  // the finger's hold on the carousel.
  useEffect(() => {
    const onScroll = (): void => {
      if (window.scrollY > 0) {
        finger.current = null;
        motionRef.current.settleNearest();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return (): void => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return {
    touched,
    takeSwipe: (): boolean => {
      const was = swiped.current;
      swiped.current = false;
      return was;
    },
    handlers: {
      onTouchStart: (event): void => {
        // While the page is scrolled the finger is moving the page, not the carousel.
        if (window.scrollY > 0) {
          finger.current = null;
          return;
        }
        const point = event.touches[0];
        const picture =
          event.target instanceof Element ? event.target.closest('[data-option]') : null;
        setTouched(picture?.getAttribute('data-option') ?? null);
        // A finger on a gliding carousel catches it where it is.
        const caught = motion.catchAt();
        swiped.current = caught !== null;
        finger.current =
          point === undefined
            ? null
            : {
                x: point.clientX,
                y: point.clientY,
                from: caught ?? motion.rest,
                sideways: null,
                samples: [{ x: point.clientX, at: event.timeStamp }],
              };
      },
      onTouchMove: (event): void => {
        const current = finger.current;
        const point = event.touches[0];
        if (current === null || point === undefined) {
          return;
        }
        const dx = point.clientX - current.x;
        if (current.sideways === null) {
          const dy = point.clientY - current.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < tapSlop) {
            return;
          }
          current.sideways = Math.abs(dx) > Math.abs(dy);
          // Up or down: the page's, and a carousel it caught gliding stands on a place.
          if (!current.sideways) {
            letGo();
            return;
          }
        }
        swiped.current = true;
        current.samples = [
          ...current.samples.filter((sample) => event.timeStamp - sample.at <= speedWindow),
          { x: point.clientX, at: event.timeStamp },
        ];
        // Right to left: the next one waits on the left, so moving the finger right brings it.
        const position = current.from + dx / stepWidth;
        const last = motion.places - 1;
        motion.moveTo(
          position < 0
            ? position * edgePull
            : position > last
              ? last + (position - last) * edgePull
              : position,
        );
      },
      onTouchCancel: (): void => {
        setTouched(null);
        letGo();
      },
      onTouchEnd: (event): void => {
        setTouched(null);
        const current = finger.current;
        finger.current = null;
        const position = motion.position();
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
        motion.glide(position, speed, current.from);
      },
    },
  };
}
