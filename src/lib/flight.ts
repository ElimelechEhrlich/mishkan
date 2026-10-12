import { flushSync } from 'react-dom';

/** Marks the "everything" circle, in the carousel or in the header; only one is shown. */
export const everythingFlight = 'everything';

/** The carousel's own pace: Tailwind's duration-300. */
export const flightDuration = 300;

/**
 * Going up, the circle moves up and down on Tailwind's ease-out and sideways on an ease-in
 * that starts slowly, so it first rises and then slides over: an arc. Coming down it runs
 * the same curves backwards in time, so it goes back on exactly the same arc.
 */
const rise = {
  upDown: 'cubic-bezier(0, 0, 0.2, 1)',
  sideways: 'cubic-bezier(0.4, 0, 1, 1)',
  size: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;
const fall = {
  upDown: 'cubic-bezier(0.8, 0, 1, 1)',
  sideways: 'cubic-bezier(0, 0, 0.6, 1)',
  size: 'cubic-bezier(0.8, 0, 1, 1)',
} as const;

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
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const curves = dy > 0 ? rise : fall;
  const time = `${String(flightDuration)}ms`;

  const zIndex = target.style.zIndex;
  target.style.zIndex = '30';
  target.style.transition = 'none';
  inner.style.transition = 'none';
  target.style.translate = `0 ${String(dy)}px`;
  inner.style.translate = `${String(dx / ownScale)}px 0`;
  inner.style.scale = String(from.width / to.width);
  // Starts from there in this frame, then moves on the next one, like the carousel.
  void target.getBoundingClientRect();
  target.style.transition = `translate ${time} ${curves.upDown}`;
  inner.style.transition = `translate ${time} ${curves.sideways}, scale ${time} ${curves.size}`;
  target.style.translate = '';
  inner.style.translate = '';
  inner.style.scale = '';

  let landed = false;
  const land = (): void => {
    if (landed) {
      return;
    }
    landed = true;
    target.removeEventListener('transitionend', onEnd);
    window.clearTimeout(fallback);
    target.style.transition = '';
    inner.style.transition = '';
    target.style.zIndex = zIndex;
    onLanded?.();
  };
  function onEnd(event: TransitionEvent): void {
    if (event.target === target && event.propertyName === 'translate') {
      land();
    }
  }
  target.addEventListener('transitionend', onEnd);
  // In case the transition never reports its end (such as the element leaving the page).
  const fallback = window.setTimeout(land, flightDuration + 50);
}
