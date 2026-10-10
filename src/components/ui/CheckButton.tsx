import type { ReactElement } from 'react';
import { Icon } from './Icon';

type CheckButtonProps = {
  readonly checked: boolean;
  readonly label: string;
  readonly onClick: () => void;
};

export function CheckButton({ checked, label, onClick }: CheckButtonProps): ReactElement {
  const tone = checked ? 'border-primary bg-primary text-white' : 'border-muted/50 bg-surface';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${tone}`}
    >
      {checked && <Icon name="check" className="size-4" />}
    </button>
  );
}
