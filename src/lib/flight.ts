import { flushSync } from 'react-dom';

/** Marks the "everything" circle, in the carousel or in the header; only one is shown. */
export const everythingFlight = 'everything';

/** The carousel's own pace: Tailwind's duration-300 with ease-out. */
const duration = 300;

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

/** Tailwind's ease-out, the carousel's curve. */
const easeOut = cubicBezier(0, 0, 0.2, 1);
/** One way of an arc starts slowly, so the circle first rises and then slides over. */
const easeIn = cubicBezier(0.4, 0, 1, 1);

function find(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-flight="${name}"]`);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs a state change that moves an element from one place to another (such as the
 * "everything" circle between the carousel and the header), and lets the element itself
 * travel from where it was. Its place is followed on every frame, so when that place is
 * still moving (a turning carousel) it lands right on it instead of drifting with it. The
 * marked element moves up and down; its first child moves sideways and grows or shrinks.
 * Without a place to start from, or when the device asks for less motion, the change simply
 * happens.
 */
export function flyWhile(name: string, update: () => void): void {
  const source = find(name);
  if (source === null || reducedMotion()) {
    update();
    return;
  }
  const from = source.getBoundingClientRect();
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;

  flushSync(update);

  const target = find(name);
  const inner = target?.firstElementChild;
  if (target === null || !(inner instanceof HTMLElement) || target.offsetWidth === 0) {
    return;
  }
  const first = target.getBoundingClientRect();
  // Going up it first rises, then slides over; coming down it goes back on the same arc,
  // first sliding over and then dropping, so it returns the way it left.
  const rising = fromY > first.top + first.height / 2;
  const upDown = rising ? easeOut : easeIn;
  const sideways = rising ? easeIn : easeOut;

  const zIndex = target.style.zIndex;
  target.style.zIndex = '30';
  let lastDy = 0;
  const start = performance.now();

  let progress = 0;
  // When the element's own place changes (a turning carousel redraws it), the flight follows
  // at once, before the frame is drawn, instead of a frame late.
  const follow = new MutationObserver(() => {
    place();
  });
  const watch = (): void => {
    follow.observe(target, { attributes: true, attributeFilter: ['style'] });
  };

  function place(): void {
    if (!(inner instanceof HTMLElement) || target === null) {
      return;
    }
    const rect = target.getBoundingClientRect();
    // Where the element itself is now, leaving out the move this flight added.
    const toX = rect.left + rect.width / 2;
    const toY = rect.top + rect.height / 2 - lastDy;
    // The element may be scaled itself (a side place in the carousel); the child moves in its units.
    const ownScale = rect.width / target.offsetWidth;
    const size = from.width / rect.width;
    lastDy = (fromY - toY) * (1 - upDown(progress));
    follow.disconnect();
    target.style.translate = `0 ${String(lastDy)}px`;
    watch();
    inner.style.translate = `${String(((fromX - toX) * (1 - sideways(progress))) / ownScale)}px 0`;
    inner.style.scale = String(size + (1 - size) * easeOut(progress));
  }

  place();
  watch();
  const tick = (now: number): void => {
    progress = Math.min(1, (now - start) / duration);
    if (progress < 1 && target.isConnected) {
      place();
      requestAnimationFrame(tick);
      return;
    }
    follow.disconnect();
    target.style.translate = '';
    inner.style.translate = '';
    inner.style.scale = '';
    target.style.zIndex = zIndex;
  };
  requestAnimationFrame(tick);
}
