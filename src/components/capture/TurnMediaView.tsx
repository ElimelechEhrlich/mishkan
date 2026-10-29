import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { TurnMedia } from '../../services/assistantService';
import { VoicePlayer } from './VoicePlayer';

type TurnMediaViewProps = {
  readonly media: TurnMedia;
  readonly onOpenPhoto: (url: string) => void;
};

/** The photo or voice message sent with a turn, inside its bubble. */
export function TurnMediaView({ media, onOpenPhoto }: TurnMediaViewProps): ReactElement {
  const { url } = media;
  if (url === null) {
    return <span className="text-[13px] opacity-80">{labels.assistant.mediaGone}</span>;
  }
  if (media.kind === 'audio') {
    return <VoicePlayer url={url} seconds={media.seconds} />;
  }
  return (
    <button
      type="button"
      aria-label={labels.assistant.openPhoto}
      onClick={() => {
        onOpenPhoto(url);
      }}
      className="-mx-1.5 -mt-0.5 block overflow-hidden rounded-xl transition active:scale-[0.98]"
    >
      <img src={url} alt="" className="max-h-52 w-full object-cover" />
    </button>
  );
}
