import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type ListRowProps = {
  readonly icon: IconName;
  /** Classes of the icon tile: its fill and the icon color. */
  readonly iconClass?: string;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly onClick?: () => void;
  /** Shown at the end of the row, such as a chevron or a small button. */
  readonly trailing?: ReactNode;
  readonly tone?: 'default' | 'alert';
};

/** A settings-style row in a list card: an icon tile, a title and an optional line under it. */
export function ListRow({
  icon,
  iconClass = 'bg-primary-soft text-primary',
  title,
  subtitle,
  onClick,
  trailing,
  tone = 'default',
}: ListRowProps): ReactElement {
  const body = (
    <>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${iconClass}`}
      >
        <Icon name={icon} className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-3 border-t border-line py-3 pe-3.5 group-first:border-t-0">
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={`truncate text-[15px] ${tone === 'alert' ? 'font-medium text-alert' : ''}`}
          >
            {title}
          </span>
          {subtitle !== undefined && (
            <span className="truncate text-xs text-muted">{subtitle}</span>
          )}
        </span>
        {trailing}
      </span>
    </>
  );

  if (onClick === undefined) {
    return <div className="group flex w-full items-center gap-3 ps-3.5">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 ps-3.5 text-start active:bg-paper"
    >
      {body}
    </button>
  );
}
