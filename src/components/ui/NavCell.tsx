import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type NavCellProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly active: boolean;
};

/** One place in the bar at the bottom: its sign over its name, green while it is open. */
export function NavCell({ icon, label, active }: NavCellProps): ReactElement {
  return (
    <>
      <span
        className={`flex items-center justify-center transition-colors ${
          active ? 'text-primary' : 'text-faint'
        }`}
      >
        <Icon name={icon} className="size-6" />
      </span>
      <span className={active ? 'font-semibold text-primary' : 'font-medium text-muted'}>
        {label}
      </span>
    </>
  );
}
