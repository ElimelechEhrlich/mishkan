import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { labels } from '../../constants/labels';
import { snoozeChoices } from '../../lib/itemRules';
import type { SnoozeChoice } from '../../lib/itemRules';
import { IconButton } from '../ui/IconButton';

type SnoozeSheetProps = {
  /** The item's title, so it is clear what will be reminded again. */
  readonly title: string;
  readonly onChoose: (choice: SnoozeChoice) => void;
  readonly onClose: () => void;
};

/**
 * Opened from "remind me again" on a reminder's notification: one tap on how long to wait
 * sets the reminder again.
 */
export function SnoozeSheet({ title, onChoose, onClose }: SnoozeSheetProps): ReactElement {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return (): void => {
      root.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex animate-fade-in items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.snooze.title}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="flex w-full max-w-sm animate-fade-in flex-col gap-3 rounded-[28px] bg-paper px-4 pt-3 pb-4 shadow-sheet"
      >
        <div className="flex items-center gap-2">
          <IconButton icon="close" label={labels.actions.close} onClick={onClose} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-lg font-bold">{labels.snooze.title}</span>
            <span className="truncate text-[13px] text-muted">{title}</span>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card">
          {snoozeChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => {
                onChoose(choice);
              }}
              className="border-t border-line px-4 py-3 text-start text-[15px] font-medium first:border-t-0 active:bg-paper"
            >
              {labels.snooze[choice]}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
