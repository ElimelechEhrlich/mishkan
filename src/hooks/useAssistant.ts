import { useCallback, useEffect, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage, withTimeout } from '../lib/errors';
import { voiceForReading } from '../lib/audio';
import { shrinkForReading } from '../lib/image';
import { announceItemsChanged } from '../lib/itemChanges';
import {
  AssistantNotEnabled,
  askAssistant,
  clearConversation,
  listConversation,
} from '../services/assistantService';
import type { AssistantTurn } from '../services/assistantService';

export type UseAssistant = {
  readonly turns: readonly AssistantTurn[];
  readonly loaded: boolean;
  /** Waiting for the answer. */
  readonly sending: boolean;
  /** Sends a message, and a photo to read (a `File` from the camera or the gallery). */
  readonly send: (message: string, photo?: File | null) => void;
  /** Sends a voice message; its bubble shows what the assistant heard. */
  readonly sendVoice: (recording: Blob) => void;
  /** Sends again the message that got no answer; null when there is none. */
  readonly retry: (() => void) | null;
  readonly clear: () => void;
  readonly error: string | null;
};

/** How long an answer may take; looking things up can take a few rounds. */
const answerMs = 60000;

/** The parent's conversation with the assistant. */
export function useAssistant(): UseAssistant {
  const [turns, setTurns] = useState<readonly AssistantTurn[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The message that got no answer, kept to send again. */
  const [failed, setFailed] = useState<{
    readonly message: string;
    readonly photo: File | null;
    readonly voice: Blob | null;
    readonly turnId: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    listConversation()
      .then((loaded) => {
        if (active) {
          setTurns(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setTurns([]);
          setError(toMessage(caught));
        }
      });
    return (): void => {
      active = false;
    };
  }, []);

  const deliver = useCallback((message: string, photo: File | null, voice: Blob | null): void => {
    const trimmed = message.trim();
    if (trimmed === '' && photo === null && voice === null) {
      return;
    }
    const turnId = `local-${String(Date.now())}`;
    const voiceLine = (heard: string | null): string =>
      `🎤 ${heard ?? labels.assistant.voiceMessage}`;
    setError(null);
    setFailed(null);
    setSending(true);
    setTurns((current) => [
      ...(current ?? []),
      {
        id: turnId,
        role: 'user',
        text: voice !== null ? voiceLine(null) : photo === null ? trimmed : `📷 ${trimmed}`.trim(),
        links: [],
      },
    ]);
    const asking =
      voice !== null
        ? voiceForReading(voice).then((audio) => askAssistant('', null, audio))
        : (photo === null ? Promise.resolve(null) : shrinkForReading(photo)).then((image) =>
            askAssistant(trimmed, image),
          );
    withTimeout(asking, answerMs)
      .then(({ reply, links, changed, heard }) => {
        setTurns((current) => [
          // A voice message's bubble says what was heard.
          ...(current ?? []).map((turn) =>
            turn.id === turnId && voice !== null ? { ...turn, text: voiceLine(heard) } : turn,
          ),
          { id: `local-${String(Date.now())}-reply`, role: 'assistant', text: reply, links },
        ]);
        if (changed) {
          announceItemsChanged();
        }
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof AssistantNotEnabled)) {
          setFailed({ message: trimmed, photo, voice, turnId });
        }
        setError(
          caught instanceof AssistantNotEnabled
            ? labels.assistant.notEnabled
            : `${labels.assistant.failed} (${toMessage(caught)})`,
        );
      })
      .finally(() => {
        setSending(false);
      });
  }, []);

  const send = useCallback(
    (message: string, photo: File | null = null): void => {
      deliver(message, photo, null);
    },
    [deliver],
  );

  const sendVoice = useCallback(
    (recording: Blob): void => {
      deliver('', null, recording);
    },
    [deliver],
  );

  // The unanswered message leaves the conversation and goes again, as it was (the server
  // keeps a message only with its answer, so nothing is doubled).
  const retry =
    failed === null || sending
      ? null
      : (): void => {
          setTurns((current) => (current ?? []).filter((turn) => turn.id !== failed.turnId));
          deliver(failed.message, failed.photo, failed.voice);
        };

  const clear = useCallback((): void => {
    clearConversation()
      .then(() => {
        setTurns([]);
        setFailed(null);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      });
  }, []);

  return {
    turns: turns ?? [],
    loaded: turns !== null,
    sending,
    send,
    sendVoice,
    retry,
    clear,
    error,
  };
}
