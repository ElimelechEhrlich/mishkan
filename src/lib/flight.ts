import { flushSync } from 'react-dom';

/** Marks the "everything" circle, in the carousel or in the header; only one is shown. */
export const everythingFlight = 'everything';

/** The carousel's own pace: Tailwind's duration-300. */
export const flightDuration = 300;

/**
 * A CSS cubic-bezier timing curve as a function: how far along (0 to 1) the move is at a
 * given share of its time.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const at = (a: number, b: number, s: number): number =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  return (t) => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    // The curve's own parameter for this point in time, found by halving.
    let low = 0;
    let high = 1;
    for (let step = 0; step < 30; step += 1) {
      const middle = (low + high) / 2;
      if (at(x1, x2, middle) < t) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return at(y1, y2, (low + high) / 2);
  };
}

/**
 * The arc between the carousel and the header, as how far along it is (0 at the carousel,
 * 1 at the header): up and down it starts quickly, sideways slowly, so going up the circle
 * first rises and then slides over. Coming down it goes back along the very same arc.
 */
const upDown = cubicBezier(0, 0, 0.2, 1);
const sideways = cubicBezier(0.4, 0, 1, 1);
/**
 * How fast it goes along the arc: gently away and gently in, the same both ways, so coming
 * down is going up run backwards.
 */
const pace = cubicBezier(0.45, 0, 0.55, 1);

function find(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-flight="${name}"]`);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Arc = {
  /** Puts the circle at a point of the arc, 0 at the carousel and 1 at the header. */
  readonly place: (along: number) => void;
  /** Hands the circle back to its own place. */
  readonly clear: () => void;
  /** How long the arc is, in pixels. */
  readonly length: number;
  /** The point of the arc this many pixels from the carousel end. */
  readonly alongAt: (pixels: number) => number;
};

/** The arc between `from` and `to` (one in the carousel, one in the header) for `target`. */
function arcFor(target: HTMLElement, inner: HTMLElement, from: DOMRect, to: DOMRect): Arc {
  // The element may be scaled itself (a side place in the carousel); the child moves in its units.
  const ownScale = to.width / target.offsetWidth;
  const rising = from.top > to.top;
  const low = rising ? from : to;
  const high = rising ? to : from;
  const lowX = low.left + low.width / 2;
  const lowY = low.top + low.height / 2;
  const highX = high.left + high.width / 2;
  const highY = high.top + high.height / 2;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height / 2;
  const point = (along: number): readonly [number, number] => [
    lowX + (highX - lowX) * sideways(along),
    lowY + (highY - lowY) * upDown(along),
  ];

  // How far along the arc each of a few points is, to go by distance as well as by time.
  const samples = 48;
  const lengths = [0];
  let [x, y] = point(0);
  for (let sample = 1; sample <= samples; sample += 1) {
    const [nextX, nextY] = point(sample / samples);
    lengths.push((lengths[sample - 1] ?? 0) + Math.hypot(nextX - x, nextY - y));
    x = nextX;
    y = nextY;
  }
  const length = lengths[samples] ?? 0;

  const zIndex = target.style.zIndex;
  target.style.zIndex = '30';
  return {
    length,
    place: (along): void => {
      const [atX, atY] = point(along);
      const width = low.width + (high.width - low.width) * upDown(along);
      target.style.translate = `0 ${String(atY - toY)}px`;
      inner.style.translate = `${String((atX - toX) / ownScale)}px 0`;
      inner.style.scale = String(width / to.width);
    },
    clear: (): void => {
      target.style.translate = '';
      inner.style.translate = '';
      inner.style.scale = '';
      target.style.zIndex = zIndex;
    },
    alongAt: (pixels): number => {
      for (let sample = 1; sample <= samples; sample += 1) {
        const end = lengths[sample] ?? length;
        if (pixels <= end) {
          const start = lengths[sample - 1] ?? 0;
          const part = end === start ? 0 : (pixels - start) / (end - start);
          return (sample - 1 + Math.max(0, part)) / samples;
        }
      }
      return 1;
    },
  };
}

/** Finds the element after the change, ready to fly, or null when it cannot. */
function landingOf(name: string): { target: HTMLElement; inner: HTMLElement } | null {
  const target = find(name);
  const inner = target?.firstElementChild;
  if (target === null || !(inner instanceof HTMLElement) || target.offsetWidth === 0) {
    return null;
  }
  return { target, inner };
}

/**
 * Runs a state change that moves an element between the carousel and the header (the
 * "everything" circle), and lets the element itself travel there along an arc, on the
 * carousel's clock. The marked element moves up and down; its first child moves sideways and
 * grows or shrinks. Without a place to start from, or when the device asks for less motion,
 * the change simply happens.
 */
export function flyWhile(name: string, update: () => void): void {
  const source = find(name);
  if (source === null || reducedMotion()) {
    update();
    return;
  }
  const from = source.getBoundingClientRect();
  flushSync(update);
  const landing = landingOf(name);
  if (landing === null) {
    return;
  }
  const { target } = landing;
  const to = target.getBoundingClientRect();
  const arc = arcFor(target, landing.inner, from, to);
  const rising = from.top > to.top;

  const start = performance.now();
  const step = (now: number): void => {
    const time = Math.min(1, (now - start) / flightDuration);
    if (time < 1 && target.isConnected) {
      const done = pace(time);
      arc.place(rising ? done : 1 - done);
      requestAnimationFrame(step);
      return;
    }
    arc.clear();
  };
  arc.place(rising ? 0 : 1);
  requestAnimationFrame(step);
}

/** The way on from the arc's carousel end, along the carousel, to the element's own place. */
export type Track = {
  /** How far, in pixels, its own place is from the arc's end now (the carousel may still turn). */
  readonly length: () => number;
  /** Draws it this many pixels on from the arc's end. */
  readonly moveTo: (pixels: number) => void;
  /** It is in its own place; the carousel takes it from here. */
  readonly done: () => void;
};

/**
 * How briskly the circle goes down and on: a spring that sets off from standing and settles
 * without overshooting, in radians per second.
 */
const spring = 14;

/**
 * Brings the circle down from the header along the arc it went up and, without stopping,
 * on along the carousel to its own place, which may still be moving: one move that sets off
 * gently and settles gently, its pace set by the whole way. Returns a way to stop it.
 */
export function flyDownAndOn(name: string, update: () => void, track: Track): () => void {
  const source = find(name);
  if (source === null || reducedMotion()) {
    update();
    track.done();
    return () => undefined;
  }
  const from = source.getBoundingClientRect();
  flushSync(update);
  const landing = landingOf(name);
  if (landing === null) {
    track.done();
    return () => undefined;
  }
  const { target } = landing;
  const arc = arcFor(target, landing.inner, from, target.getBoundingClientRect());

  let travelled = 0;
  let speed = 0;
  let onArc = true;
  let last = performance.now();
  let frame = 0;
  const step = (now: number): void => {
    const seconds = Math.min(0.05, Math.max(0, now - last) / 1000);
    last = now;
    const goal = arc.length + Math.max(0, track.length());
    speed += (spring ** 2 * (goal - travelled) - 2 * spring * speed) * seconds;
    travelled += speed * seconds;
    if (travelled < arc.length) {
      arc.place(arc.alongAt(arc.length - travelled));
    } else {
      if (onArc) {
        onArc = false;
        arc.clear();
      }
      track.moveTo(travelled - arc.length);
    }
    if (!target.isConnected || (Math.abs(goal - travelled) < 0.5 && Math.abs(speed) < 5)) {
      arc.clear();
      track.done();
      return;
    }
    frame = requestAnimationFrame(step);
  };
  arc.place(1);
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    arc.clear();
  };
}
