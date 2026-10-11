import type { ReactElement } from 'react';

const rows = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4'] as const;

/** A placeholder list card shown while a list is loading. */
export function SkeletonList(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-surface shadow-card"
    >
      {rows.map((width) => (
        <div key={width} className="group flex items-center gap-3 px-3.5">
          <span className="size-5.5 shrink-0 rounded-full bg-line" />
          <span className="flex flex-1 flex-col gap-2 border-t border-line py-3.5 group-first:border-t-0">
            <span className={`h-3 rounded-full bg-line ${width}`} />
            <span className="h-2 w-1/3 rounded-full bg-line/70" />
          </span>
        </div>
      ))}
    </div>
  );
}
