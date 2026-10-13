import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

type ConfirmButtonProps = {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
};

/** A destructive action that needs a second tap. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
}: ConfirmButtonProps): ReactElement {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant={armed ? 'danger' : 'quiet'}
      onClick={() => {
        if (armed) {
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      <Icon name="trash" className="size-4.5" />
      {armed ? confirmLabel : label}
    </Button>
  );
}
