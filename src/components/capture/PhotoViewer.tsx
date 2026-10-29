import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';

type PhotoViewerProps = {
  readonly url: string;
  readonly onClose: () => void;
};

/** A photo sent in the conversation, open over the whole screen. */
export function PhotoViewer({ url, onClose }: PhotoViewerProps): ReactElement {
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={labels.assistant.openPhoto}
      onClick={onClose}
      className="fixed inset-0 z-40 flex animate-fade-in items-center justify-center bg-ink/90 p-3"
    >
      <img src={url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
      <button
        type="button"
        aria-label={labels.actions.close}
        onClick={onClose}
        className="absolute end-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-90"
      >
        <Icon name="close" className="size-5" />
      </button>
    </div>
  );
}
