import type { ReactElement } from 'react';
import { Icon } from './Icon';

type CheckButtonProps = {
  readonly checked: boolean;
  readonly label: string;
  readonly onClick: () => void;
  /** Border class of the empty circle, such as the color of the item's entity. */
  readonly toneClass?: string | undefined;
  readonly small?: boolean;
};

export function CheckButton({
  checked,
  label,
  onClick,
  toneClass = 'border-faint',
  small = false,
}: CheckButtonProps): ReactElement {
  const look = checked ? 'border-primary bg-primary text-white' : `${toneClass} bg-surface`;
  const size = small ? 'size-4.5 border-[1.5px]' : 'size-5.5 border-2';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="-m-2.5 flex shrink-0 items-center justify-center p-2.5 transition active:scale-90"
    >
      <span className={`flex items-center justify-center rounded-full ${size} ${look}`}>
        {checked && <Icon name="check" className={small ? 'size-3' : 'size-3.5'} />}
      </span>
    </button>
  );
}
