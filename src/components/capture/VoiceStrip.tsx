import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatElapsed } from '../../lib/audio';
import { Icon } from '../ui/Icon';

type VoiceStripProps = {
  readonly elapsed: number;
  /** Recording on its own (after a tap), rather than while the button is held. */
  readonly locked: boolean;
  /** While holding, the finger slid to the bin: letting go throws it away. */
  readonly aiming: boolean;
  readonly onCancel: () => void;
};

/** What stands in place of the text line while a voice message is recorded. */
export function VoiceStrip({ elapsed, locked, aiming, onCancel }: VoiceStripProps): ReactElement {
  return (
    <div className="flex min-h-11 min-w-0 flex-1 animate-fade-in items-center gap-2 rounded-full border border-line bg-surface ps-1 pe-5 shadow-card">
      {/* While holding, the bin is where to slide to; once locked, a button. */}
      {locked ? (
        <button
          type="button"
          aria-label={labels.assistant.cancelVoice}
          onClick={onCancel}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 active:bg-line"
        >
          <Icon name="trash" className="size-4.5" />
        </button>
      ) : (
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${
            aiming ? 'scale-110 bg-alert text-white' : 'text-muted'
          }`}
        >
          <Icon name="trash" className="size-4.5" />
        </span>
      )}
      <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-alert" aria-hidden />
      <span className="text-[15px] font-semibold tabular-nums" dir="ltr">
        {formatElapsed(elapsed)}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${aiming ? 'font-semibold text-alert' : 'text-muted'}`}
        role="status"
      >
        {locked
          ? labels.assistant.recording
          : aiming
            ? labels.assistant.releaseToCancel
            : labels.assistant.slideToCancel}
      </span>
    </div>
  );
}
