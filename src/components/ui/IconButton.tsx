import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type IconButtonProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly tone?: 'muted' | 'alert' | 'primary';
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
}: IconButtonProps): ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition active:bg-line ${toneClasses[tone]}`}
    >
      <Icon name={icon} />
    </button>
  );
}
