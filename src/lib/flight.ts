import { flushSync } from 'react-dom';

/** Marks the "everything" circle, in the carousel or in the header; only one is shown. */
export const everythingFlight = 'everything';

/** The same pace as the carousel: Tailwind's duration-300 with ease-out. */
const timing = { duration: 300, easing: 'cubic-bezier(0, 0, 0.2, 1)' } as const;

function find(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-flight="${name}"]`);
}

/**
 * Runs a state change that moves an element from one place to another (such as the
 * "everything" circle between the carousel and the header), and flies a copy of it
 * from where it was to where it lands, in step with the carousel. The real one is hidden
 * until the copy arrives. Without animation support, or when the device asks for less
 * motion, the change simply happens.
 */
export function flyWhile(name: string, update: () => void): void {
  const source = find(name);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy = source?.cloneNode(true);
  if (source === null || reduced || !(copy instanceof HTMLElement)) {
    update();
    return;
  }
  const from = source.getBoundingClientRect();
  const width = source.offsetWidth;
  const height = source.offsetHeight;
  const fromOpacity = getComputedStyle(source).opacity;

  flushSync(update);

  const target = find(name);
  if (target === null || width === 0) {
    return;
  }
  const to = target.getBoundingClientRect();
  const toOpacity = getComputedStyle(target).opacity;

  copy.removeAttribute('data-flight');
  copy.setAttribute('aria-hidden', 'true');
  Object.assign(copy.style, {
    position: 'fixed',
    left: `${String(from.left)}px`,
    top: `${String(from.top)}px`,
    width: `${String(width)}px`,
    height: `${String(height)}px`,
    margin: '0',
    transition: 'none',
    transformOrigin: '0 0',
    zIndex: '50',
    pointerEvents: 'none',
  });
  document.body.append(copy);
  target.style.visibility = 'hidden';

  const flight = copy.animate(
    [
      { transform: `scale(${String(from.width / width)})`, opacity: fromOpacity },
      {
        transform: `translate(${String(to.left - from.left)}px, ${String(to.top - from.top)}px) scale(${String(to.width / width)})`,
        opacity: toOpacity,
      },
    ],
    timing,
  );
  const land = (): void => {
    target.style.visibility = '';
    copy.remove();
  };
  flight.onfinish = land;
  flight.oncancel = land;
}
