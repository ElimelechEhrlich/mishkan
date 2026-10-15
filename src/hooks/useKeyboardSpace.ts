import { useEffect, useState } from 'react';

/** How much of the screen the keyboard covers, and how tall what is left above it is. */
export type KeyboardSpace = { readonly covered: number; readonly visible: number | null };

function measure(): KeyboardSpace {
  const viewport = window.visualViewport;
  if (viewport === null) {
    return { covered: 0, visible: null };
  }
  return {
    covered: Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
    visible: viewport.height,
  };
}

/**
 * Follows the phone's keyboard, so a sheet opened from the bottom can sit just above it, with
 * its buttons in sight, instead of being covered by it.
 */
export function useKeyboardSpace(): KeyboardSpace {
  const [space, setSpace] = useState(measure);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport === null) {
      return;
    }
    const update = (): void => {
      setSpace(measure());
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return (): void => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return space;
}
