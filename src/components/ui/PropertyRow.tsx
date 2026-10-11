import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';

type PropertyRowProps = {
  readonly label: string;
  readonly value: string;
  /** Shows the value as something that still has to be chosen. */
  readonly missing?: boolean;
  readonly open: boolean;
  readonly onToggle: () => void;
  /** The editor shown when the row is open. Without it the row cannot be opened. */
  readonly children?: ReactNode;
  /** A short note shown under a row that cannot be opened. */
  readonly hint?: string | undefined;
};

/** One line of a settings-style list: a label, its current value at the end, and an editor that unfolds. */
export function PropertyRow({
  label,
  value,
  missing = false,
  open,
  onToggle,
  children,
  hint,
}: PropertyRowProps): ReactElement {
  const editable = children !== undefined;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={!editable}
        aria-expanded={editable ? open : undefined}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-3 py-2 text-start"
      >
        <span className="shrink-0 text-[15px]">{label}</span>
        <span
          className={`min-w-0 flex-1 truncate text-end text-[15px] ${
            missing ? 'font-medium text-alert' : 'text-muted'
          }`}
        >
          {value}
        </span>
        {editable && (
          <Icon
            name="down"
            className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {hint !== undefined && <p className="-mt-1 pb-3 text-[13px] text-muted">{hint}</p>}
      {editable && open && <div className="pb-4">{children}</div>}
    </div>
  );
}
