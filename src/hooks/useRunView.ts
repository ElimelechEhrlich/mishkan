import { useState } from 'react';

/** How a supermarket run is shown: by department in the shop's order, or as the items were added. */
export type RunView = 'departments' | 'added';

const key = 'mishkan.runView';

function stored(): RunView {
  try {
    return window.localStorage.getItem(key) === 'added' ? 'added' : 'departments';
  } catch {
    return 'departments';
  }
}

/** The way of showing a run, as last chosen on this device. */
export function useRunView(): readonly [RunView, (view: RunView) => void] {
  const [view, setView] = useState<RunView>(stored);
  return [
    view,
    (next: RunView): void => {
      setView(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage blocked: the choice holds for this visit.
      }
    },
  ];
}
