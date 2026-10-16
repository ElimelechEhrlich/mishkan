import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type ConfirmButtonProps = {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  /** Deleting, unless it says otherwise. */
  readonly icon?: IconName;
};

/** A destructive action that needs a second tap. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  icon = 'trash',
}: ConfirmButtonProps): ReactElement {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant={armed ? 'danger' : 'quiet'}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      <Icon name={icon} className="size-4.5" />
      {armed ? confirmLabel : label}
    </Button>
  );
}
