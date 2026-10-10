import { useState } from 'react';
import type { ReactElement } from 'react';
import { IconButton } from './IconButton';

type ConfirmIconButtonProps = {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
};

/** A delete icon that turns red on the first tap and acts on the second. */
export function ConfirmIconButton({
  label,
  confirmLabel,
  onConfirm,
}: ConfirmIconButtonProps): ReactElement {
  const [armed, setArmed] = useState(false);
  return (
    <span className={armed ? 'rounded-full bg-alert-soft' : ''}>
      <IconButton
        icon="trash"
        label={armed ? confirmLabel : label}
        tone={armed ? 'alert' : 'muted'}
        onClick={() => {
          if (armed) {
            onConfirm();
          }
          setArmed(!armed);
        }}
      />
    </span>
  );
}
