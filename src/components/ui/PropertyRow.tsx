import { useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { PropertyChipsContext } from './propertyLayout';

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
  /** As a chip, the icon that stands for the label; without one, the label is written. */
  readonly icon?: IconName | undefined;
};

/**
 * One line of a settings-style list: a label, its current value at the end, and an editor that
 * unfolds. Inside `PropertyChips` it is a small chip instead.
 */
export function PropertyRow({
  label,
  value,
  missing = false,
  open,
  onToggle,
  children,
  hint,
  icon,
}: PropertyRowProps): ReactElement {
  const asChip = useContext(PropertyChipsContext);
  const editable = children !== undefined;

  if (asChip) {
    const tone = open
      ? 'bg-primary-soft text-primary ring-1 ring-primary/25'
      : missing
        ? 'bg-surface text-alert shadow-card'
        : 'bg-surface text-ink shadow-card';
    return (
      <>
        <button
          type="button"
          disabled={!editable}
          aria-expanded={editable ? open : undefined}
          aria-label={`${label}: ${value}`}
          onClick={onToggle}
          className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition active:scale-[0.97] ${tone}`}
        >
          {icon === undefined ? (
            <span className="shrink-0 text-faint">{label}</span>
          ) : (
            <Icon name={icon} className="size-3.5 shrink-0 opacity-60" />
          )}
          <span className="truncate">{value}</span>
        </button>
        {editable && open && (
          <div className="order-last flex basis-full flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            {children}
          </div>
        )}
      </>
    );
  }

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
