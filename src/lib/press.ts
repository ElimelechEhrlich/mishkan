/** What answers a tap: buttons, links, tabs, options, switches and the labels of a choice. */
const pressable = [
  'button:not(:disabled)',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  'label:has(input[type="file"])',
  'label:has(input[type="checkbox"])',
  'label:has(input[type="radio"])',
].join(', ');

/** The shortest time the press shows, so even a quick tap is seen. */
const shortestMs = 140;
/**
 * How long, from the touch, the press is seen before the page changes: a quick tap waits only
 * what is left of it, a held one not at all.
 */
const beforeLeavingMs = 110;

/** A tap that opens another page in the app: a link here, or a button marked `data-leaves`. */
function leavesPage(element: Element): boolean {
  if (element.hasAttribute('data-leaves')) {
    return true;
  }
  return (
    element instanceof HTMLAnchorElement &&
    element.target === '' &&
    !element.hasAttribute('download') &&
    element.origin === window.location.origin
  );
}

/**
 * Marks what the finger is on with `data-pressed` from the moment it touches until it lifts
 * (at least a moment), and lets it go when the touch turns into a scroll. The look is in
 * index.css, so every tappable thing in the app answers the same way, whatever its color.
 */
export function showPresses(): void {
  let pressed: Element | null = null;
  let since = 0;
  let timer = 0;
  // A click let through after its wait, so it is not held a second time.
  const letThrough = new WeakSet<Element>();

  const release = (): void => {
    const element = pressed;
    if (element === null) {
      return;
    }
    pressed = null;
    window.clearTimeout(timer);
    timer = window.setTimeout(
      () => {
        element.removeAttribute('data-pressed');
      },
      Math.max(0, shortestMs - (performance.now() - since)),
    );
  };

  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(pressable) : null;
      if (target === null) {
        return;
      }
      if (pressed !== null) {
        pressed.removeAttribute('data-pressed');
      }
      pressed = target;
      since = performance.now();
      target.setAttribute('data-pressed', '');
    },
    { passive: true },
  );
  document.addEventListener('pointerup', release, { passive: true });
  // What changes the page waits for the press to be seen, then goes on as it would have.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(pressable) : null;
      if (target !== null && letThrough.has(target)) {
        letThrough.delete(target);
        return;
      }
      if (
        target === null ||
        event.detail === 0 ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !leavesPage(target)
      ) {
        return;
      }
      const wait = beforeLeavingMs - (performance.now() - since);
      if (wait <= 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      window.setTimeout(() => {
        if (target.isConnected && target instanceof HTMLElement) {
          letThrough.add(target);
          target.click();
        }
      }, wait);
    },
    { capture: true },
  );
  // A touch that becomes a scroll or a swipe is not a tap.
  document.addEventListener(
    'pointercancel',
    () => {
      if (pressed !== null) {
        pressed.removeAttribute('data-pressed');
        pressed = null;
      }
    },
    { passive: true },
  );
}
