import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type IconButtonProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly tone?: 'muted' | 'alert' | 'primary';
  /** For toggles: shows the button as switched on. */
  readonly pressed?: boolean | undefined;
  /** It opens another page, so its press is seen first (lib/press.ts). */
  readonly leaves?: boolean;
};

const toneClasses = {
  muted: 'text-muted',
  alert: 'text-alert',
  primary: 'text-primary',
} as const;

export function IconButton({
  icon,
  label,
  onClick,
  tone = 'muted',
  pressed,
  leaves = false,
}: IconButtonProps): ReactElement {
  const look = pressed === true ? 'bg-primary-soft text-primary' : toneClasses[tone];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-leaves={leaves ? '' : undefined}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition active:bg-line ${look}`}
    >
      <Icon name={icon} />
    </button>
  );
}
