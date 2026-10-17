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
 * Marks what the finger is on with `data-pressed` from the moment it touches until it lifts
 * (at least a moment), and lets it go when the touch turns into a scroll. The look is in
 * index.css, so every tappable thing in the app answers the same way, whatever its color.
 */
export function showPresses(): void {
  let pressed: Element | null = null;
  let since = 0;
  let timer = 0;

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
