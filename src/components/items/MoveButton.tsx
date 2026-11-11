import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';

type MoveButtonProps = {
  readonly onClick: () => void;
};

/** At the foot of a list: opens the days and times to move items of it to. */
export function MoveButton({ onClick }: MoveButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-semibold whitespace-nowrap text-primary transition active:scale-[0.97]"
    >
      <Icon name="calendar" className="size-3.5" />
      {labels.move.open}
      <Icon name="down" className="size-3.5" />
    </button>
  );
}
