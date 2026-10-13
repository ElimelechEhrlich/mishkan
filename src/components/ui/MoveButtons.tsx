import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';

type MoveButtonsProps = {
  /** Moves one place up or down; undefined where it cannot go further. */
  readonly onMoveUp: (() => void) | undefined;
  readonly onMoveDown: (() => void) | undefined;
};

/**
 * Changing where a row stands: a small labelled pill with two arrows, so it does not look
 * like the arrow that opens and folds a row. An end it cannot go past stays, faded.
 */
export function MoveButtons({ onMoveUp, onMoveDown }: MoveButtonsProps): ReactElement {
  const arrow = (
    icon: 'arrowUp' | 'arrowDown',
    label: string,
    onClick: (() => void) | undefined,
  ): ReactElement => (
    <button
      type="button"
      aria-label={label}
      disabled={onClick === undefined}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-primary transition active:bg-primary-soft disabled:text-faint disabled:opacity-50"
    >
      <Icon name={icon} className="size-4" />
    </button>
  );
  return (
    <div
      role="group"
      aria-label={labels.actions.order}
      className="flex items-center rounded-full border border-line bg-surface ps-2.5"
    >
      <span className="text-[11px] font-semibold text-muted">{labels.actions.order}</span>
      {arrow('arrowUp', labels.actions.moveUp, onMoveUp)}
      {arrow('arrowDown', labels.actions.moveDown, onMoveDown)}
    </div>
  );
}
