import { useCallback, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage, withTimeout } from '../lib/errors';
import type { AnswerLink } from '../lib/format';
import { announceItemsChanged } from '../lib/itemChanges';
import { AssistantNotEnabled, askWith } from '../services/assistantService';

/** An answer shown where the question was written, without opening the conversation. */
export type QuickAnswer = {
  readonly question: string;
  readonly reply: string;
  readonly links: readonly AnswerLink[];
};

export type UseQuickAsk = {
  readonly sending: boolean;
  /** The last answer, until it is closed. */
  readonly answer: QuickAnswer | null;
  readonly error: string | null;
  /** Asks the assistant; the answer replaces the one shown. */
  readonly ask: (message: string, photo: File | null) => void;
  /** Sends a voice message; the assistant hears it, tone and all. */
  readonly askVoice: (recording: Blob, seconds: number) => void;
  readonly close: () => void;
};

/** How long an answer may take; looking things up can take a few rounds. */
const answerMs = 60000;

/**
 * A question to the assistant from a line on a screen. It goes into the same conversation (the
 * server keeps it), and its answer shows in place, to close when read.
 */
export function useQuickAsk(): UseQuickAsk {
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState<QuickAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (asking: ReturnType<typeof askWith>, question: (heard: string | null) => string): void => {
      setSending(true);
      setError(null);
      setAnswer(null);
      withTimeout(asking, answerMs)
        .then(({ reply, links, changed, heard }) => {
          setAnswer({ question: question(heard), reply, links });
          if (changed) {
            announceItemsChanged();
          }
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof AssistantNotEnabled
              ? labels.assistant.notEnabled
              : `${labels.assistant.failed} (${toMessage(caught)})`,
          );
        })
        .finally(() => {
          setSending(false);
        });
    },
    [],
  );

  const ask = useCallback(
    (message: string, photo: File | null): void => {
      const question = message.trim();
      if (question === '' && photo === null) {
        return;
      }
      run(askWith(question, photo === null ? null : { kind: 'photo', file: photo }), () =>
        photo === null ? question : `📷 ${question}`.trim(),
      );
    },
    [run],
  );

  const askVoice = useCallback(
    (recording: Blob, seconds: number): void => {
      run(
        askWith('', { kind: 'voice', recording, seconds }),
        (heard) => `🎤 ${heard ?? labels.assistant.voiceMessage}`,
      );
    },
    [run],
  );

  const close = useCallback((): void => {
    setAnswer(null);
    setError(null);
  }, []);

  return { sending, answer, error, ask, askVoice, close };
}
