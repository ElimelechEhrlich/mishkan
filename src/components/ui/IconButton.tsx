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
}: IconButtonProps): ReactElement {
  const look = pressed === true ? 'bg-primary-soft text-primary' : toneClasses[tone];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition active:bg-line ${look}`}
    >
      <Icon name={icon} />
    </button>
  );
}
