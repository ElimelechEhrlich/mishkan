import { useState } from 'react';
import type { ReactElement } from 'react';
import { Icon } from './Icon';

type ConfirmChipProps = {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
};

/** A small destructive action, such as deleting, that needs a second tap. */
export function ConfirmChip({ label, confirmLabel, onConfirm }: ConfirmChipProps): ReactElement {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-alert transition active:scale-[0.97] ${
        armed ? 'bg-alert-soft' : ''
      }`}
    >
      <Icon name="trash" className="size-4" />
      {armed ? confirmLabel : label}
    </button>
  );
}
