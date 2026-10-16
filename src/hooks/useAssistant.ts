import { useCallback, useEffect, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage, withTimeout } from '../lib/errors';
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
  readonly send: (message: string) => void;
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

  const send = useCallback((message: string): void => {
    const trimmed = message.trim();
    if (trimmed === '') {
      return;
    }
    setError(null);
    setSending(true);
    setTurns((current) => [
      ...(current ?? []),
      { id: `local-${String(Date.now())}`, role: 'user', text: trimmed },
    ]);
    withTimeout(askAssistant(trimmed), answerMs)
      .then(({ reply, changed }) => {
        setTurns((current) => [
          ...(current ?? []),
          { id: `local-${String(Date.now())}-reply`, role: 'assistant', text: reply },
        ]);
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
  }, []);

  const clear = useCallback((): void => {
    clearConversation()
      .then(() => {
        setTurns([]);
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      });
  }, []);

  return { turns: turns ?? [], loaded: turns !== null, sending, send, clear, error };
}
