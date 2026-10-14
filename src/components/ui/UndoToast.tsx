import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { takeUndo, useUndoOffer } from '../../hooks/useUndoOffer';

/**
 * A short bar over the bottom of the screen after a change that can be taken back, such as
 * marking an item done by mistake: what happened, and "undo". It goes away by itself.
 */
export function UndoToast(): ReactElement | null {
  const offer = useUndoOffer();
  if (offer === null) {
    return null;
  }
  return (
    <div
      key={offer.id}
      role="status"
      className="fixed inset-x-4 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md animate-fade-in items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-2.5 text-[15px] text-white shadow-float"
    >
      <span className="min-w-0 truncate">{offer.text}</span>
      <button
        type="button"
        onClick={takeUndo}
        className="min-h-9 shrink-0 rounded-lg px-2 font-semibold text-primary-soft active:opacity-70"
      >
        {labels.undo.action}
      </button>
    </div>
  );
}
