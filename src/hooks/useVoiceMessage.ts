import { useCallback, useEffect, useRef, useState } from 'react';
import { labels } from '../constants/labels';
import { voiceMaxSeconds } from '../lib/audio';

export type UseVoiceMessage = {
  /** Asking for the microphone, or recording. */
  readonly active: boolean;
  /** Recording on its own, after a short tap: it waits for "שליחה" or "ביטול". */
  readonly locked: boolean;
  /** Seconds recorded so far. */
  readonly elapsed: number;
  /** The microphone button went down: recording starts. */
  readonly press: () => void;
  /** It came up: after a hold, the message is sent; after a short tap, it keeps recording. */
  readonly release: () => void;
  readonly send: () => void;
  readonly cancel: () => void;
  readonly error: string | null;
};

/** A press shorter than this is a tap, which keeps recording; a longer one is a hold. */
const tapMs = 400;

/** The first kind of recording the device knows, or its own default. */
function recordingType(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

/**
 * A voice message: hold the microphone, speak and let go to send; or tap it, speak, and send
 * or cancel. Nothing is kept: the recording lives until it is sent or thrown away. It is sent
 * by itself after `voiceMaxSeconds`.
 */
export function useVoiceMessage(onVoice: (recording: Blob) => void): UseVoiceMessage {
  const [state, setState] = useState<'idle' | 'starting' | 'recording'>('idle');
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const pressedAt = useRef(0);
  const startedAt = useRef(0);
  /** Set when it was cancelled before the microphone was given. */
  const dropped = useRef(false);
  const deliver = useRef(onVoice);
  useEffect(() => {
    deliver.current = onVoice;
  }, [onVoice]);

  const reset = useCallback((): void => {
    recorder.current?.stream.getTracks().forEach((track) => {
      track.stop();
    });
    recorder.current = null;
    chunks.current = [];
    setState('idle');
    setLocked(false);
    setElapsed(0);
  }, []);

  const press = useCallback((): void => {
    if (state !== 'idle') {
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !('mediaDevices' in navigator)) {
      setError(labels.assistant.voiceUnsupported);
      return;
    }
    setError(null);
    dropped.current = false;
    chunks.current = [];
    pressedAt.current = Date.now();
    setState('starting');
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (dropped.current) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }
        const type = recordingType();
        const next = new MediaRecorder(stream, type === undefined ? {} : { mimeType: type });
        next.ondataavailable = (event): void => {
          if (event.data.size > 0) {
            chunks.current.push(event.data);
          }
        };
        recorder.current = next;
        startedAt.current = Date.now();
        next.start(250);
        setState('recording');
      })
      .catch(() => {
        reset();
        setError(labels.assistant.voiceBlocked);
      });
  }, [state, reset]);

  const send = useCallback((): void => {
    const current = recorder.current;
    if (current === null) {
      dropped.current = true;
      reset();
      return;
    }
    current.onstop = (): void => {
      const recorded = chunks.current;
      chunks.current = [];
      if (recorded.length > 0) {
        deliver.current(new Blob(recorded, { type: current.mimeType }));
      }
    };
    current.stop();
    current.stream.getTracks().forEach((track) => {
      track.stop();
    });
    recorder.current = null;
    setState('idle');
    setLocked(false);
    setElapsed(0);
  }, [reset]);

  const release = useCallback((): void => {
    // A tap, or a hold that ended while the microphone was still being asked for.
    if (Date.now() - pressedAt.current < tapMs || recorder.current === null) {
      setLocked(true);
      return;
    }
    send();
  }, [send]);

  const cancel = useCallback((): void => {
    dropped.current = true;
    const current = recorder.current;
    if (current !== null) {
      current.onstop = null;
      current.stop();
    }
    reset();
  }, [reset]);

  // The running clock, and the limit.
  useEffect(() => {
    if (state !== 'recording') {
      return;
    }
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      if (seconds >= voiceMaxSeconds) {
        send();
      }
    }, 250);
    return (): void => {
      window.clearInterval(timer);
    };
  }, [state, send]);

  // Leaving the screen lets the microphone go.
  useEffect(
    () => (): void => {
      dropped.current = true;
      recorder.current?.stream.getTracks().forEach((track) => {
        track.stop();
      });
    },
    [],
  );

  return { active: state !== 'idle', locked, elapsed, press, release, send, cancel, error };
}
