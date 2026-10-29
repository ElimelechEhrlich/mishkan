import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatElapsed } from '../../lib/audio';
import { Icon } from '../ui/Icon';

type VoicePlayerProps = {
  readonly url: string;
  /** How long it runs, as recorded (a recording's own length is not always known). */
  readonly seconds: number | null;
};

/** A voice message in the conversation, to hear again: play or pause, and how far it went. */
export function VoicePlayer({ url, seconds }: VoicePlayerProps): ReactElement {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const total = seconds ?? 0;

  useEffect(() => {
    const element = audio.current;
    return (): void => {
      element?.pause();
    };
  }, []);

  return (
    <span className="flex min-w-48 items-center gap-2.5">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onTimeUpdate={(event) => {
          setPosition(event.currentTarget.currentTime);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onPlay={() => {
          setPlaying(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
      />
      <button
        type="button"
        aria-label={playing ? labels.assistant.pause : labels.assistant.play}
        onClick={() => {
          const element = audio.current;
          if (element === null) {
            return;
          }
          if (element.paused) {
            void element.play();
          } else {
            element.pause();
          }
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 transition active:scale-90"
      >
        <Icon name={playing ? 'pause' : 'play'} className="size-4.5" />
      </button>
      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/30">
        <span
          className="absolute inset-y-0 start-0 rounded-full bg-white"
          style={{
            width: `${String(total > 0 ? Math.min(100, (position / total) * 100) : 0)}%`,
          }}
        />
      </span>
      <span className="text-[13px] tabular-nums opacity-80" dir="ltr">
        {formatElapsed(playing || position > 0 ? position : total)}
      </span>
    </span>
  );
}
