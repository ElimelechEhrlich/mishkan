import { flushSync } from 'react-dom';

/** Marks the "everything" circle, in the carousel or in the header; only one is shown. */
export const everythingFlight = 'everything';

/** The carousel's own pace: Tailwind's duration-300 with ease-out. */
const duration = 300;
const easeOut = 'cubic-bezier(0, 0, 0.2, 1)';
/** One way of an arc starts slowly, so the circle first rises and then slides over. */
const easeIn = 'cubic-bezier(0.4, 0, 1, 1)';

function find(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-flight="${name}"]`);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs a state change that moves an element from one place to another (such as the
 * "everything" circle between the carousel and the header), and lets the element itself
 * travel from where it was, with CSS transitions like the carousel's, so both move on the
 * same clock. The marked element moves up and down; its first child moves sideways and
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

  const target = find(name);
  const inner = target?.firstElementChild;
  if (target === null || !(inner instanceof HTMLElement) || target.offsetWidth === 0) {
    return;
  }
  const to = target.getBoundingClientRect();
  // The element may be scaled itself (a side place in the carousel); the child moves in its units.
  const ownScale = to.width / target.offsetWidth;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);

  const zIndex = target.style.zIndex;
  target.style.zIndex = '30';
  target.style.transition = 'none';
  inner.style.transition = 'none';
  target.style.translate = `0 ${String(dy)}px`;
  inner.style.translate = `${String(dx / ownScale)}px 0`;
  inner.style.scale = String(from.width / to.width);
  // Starts from there in this frame, then moves on the next one, like the carousel.
  void target.getBoundingClientRect();
  // Going up it first rises, then slides over; coming down it goes back on the same arc,
  // first sliding over and then dropping, so it returns the way it left.
  const rising = dy > 0;
  const upDown = rising ? easeOut : easeIn;
  const sideways = rising ? easeIn : easeOut;
  target.style.transition = `translate ${String(duration)}ms ${upDown}`;
  inner.style.transition = `translate ${String(duration)}ms ${sideways}, scale ${String(duration)}ms ${easeOut}`;
  target.style.translate = '';
  inner.style.translate = '';
  inner.style.scale = '';

  window.setTimeout(() => {
    target.style.transition = '';
    inner.style.transition = '';
    target.style.zIndex = zIndex;
  }, duration + 50);
}
