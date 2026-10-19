import type { ReactElement } from 'react';

/** One number at the top of today's page, with its name; zero is quiet, late or urgent is red. */
export function HeroCount({
  value,
  label,
  alert = false,
}: {
  readonly value: number;
  readonly label: string;
  readonly alert?: boolean;
}): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center rounded-2xl bg-surface/80 py-2">
      <span
        className={`font-display text-2xl leading-7 font-bold ${
          value === 0 ? 'text-faint' : alert ? 'text-alert' : 'text-ink'
        }`}
      >
        {String(value)}
      </span>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </div>
  );
}
