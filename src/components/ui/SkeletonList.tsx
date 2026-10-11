import type { ReactElement } from 'react';

const rows = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4'] as const;

/** Placeholder cards shown while a list is loading. */
export function SkeletonList(): ReactElement {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-2">
      {rows.map((width) => (
        <div key={width} className="flex items-center gap-3 rounded-2xl bg-surface/70 px-4 py-4">
          <span className="size-7 shrink-0 rounded-full bg-line" />
          <span className="flex flex-1 flex-col gap-2">
            <span className={`h-3.5 rounded-full bg-line ${width}`} />
            <span className="h-2.5 w-1/3 rounded-full bg-line/70" />
          </span>
        </div>
      ))}
    </div>
  );
}
