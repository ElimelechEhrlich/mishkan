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

/**
 * Runs a state change that moves an element between the carousel and the header (the
 * "everything" circle), and lets the element itself travel there along an arc, on the
 * carousel's clock. The marked element moves up and down; its first child moves sideways and
 * grows or shrinks. Without a place to start from, or when the device asks for less motion,
 * the change simply happens. `onLanded` runs the moment it arrives (or at once, without a
 * flight).
 */
export function flyWhile(name: string, update: () => void, onLanded?: () => void): void {
  const source = find(name);
  if (source === null || reducedMotion()) {
    update();
    onLanded?.();
    return;
  }
  const from = source.getBoundingClientRect();

  flushSync(update);

  const target = find(name);
  const inner = target?.firstElementChild;
  if (target === null || !(inner instanceof HTMLElement) || target.offsetWidth === 0) {
    onLanded?.();
    return;
  }
  const to = target.getBoundingClientRect();
  // The element may be scaled itself (a side place in the carousel); the child moves in its units.
  const ownScale = to.width / target.offsetWidth;
  const rising = from.top > to.top;
  const low = rising ? from : to;
  const high = rising ? to : from;
  const lowX = low.left + low.width / 2;
  const lowY = low.top + low.height / 2;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height / 2;

  /** Puts the circle at a point of the arc, 0 at the carousel and 1 at the header. */
  const place = (along: number): void => {
    const x = lowX + (high.left + high.width / 2 - lowX) * sideways(along);
    const y = lowY + (high.top + high.height / 2 - lowY) * upDown(along);
    const width = low.width + (high.width - low.width) * upDown(along);
    target.style.translate = `0 ${String(y - toY)}px`;
    inner.style.translate = `${String((x - toX) / ownScale)}px 0`;
    inner.style.scale = String(width / to.width);
  };

  const zIndex = target.style.zIndex;
  target.style.zIndex = '30';
  const start = performance.now();
  const step = (now: number): void => {
    const time = Math.min(1, (now - start) / flightDuration);
    if (time < 1 && target.isConnected) {
      const done = pace(time);
      place(rising ? done : 1 - done);
      requestAnimationFrame(step);
      return;
    }
    target.style.translate = '';
    inner.style.translate = '';
    inner.style.scale = '';
    target.style.zIndex = zIndex;
    onLanded?.();
  };
  place(rising ? 0 : 1);
  requestAnimationFrame(step);
}
