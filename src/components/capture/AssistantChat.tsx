import { useEffect, useRef, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { AssistantTurn } from '../../services/assistantService';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon } from '../ui/Icon';

type AssistantChatProps = {
  readonly turns: readonly AssistantTurn[];
  readonly sending: boolean;
  readonly onSend: (message: string) => void;
  readonly onClear: () => void;
};

/**
 * A conversation with the assistant: the parent's messages on one side, its answers on the
 * other, a few ready questions to start with, and a line to write in at the bottom.
 */
export function AssistantChat({
  turns,
  sending,
  onSend,
  onClear,
}: AssistantChatProps): ReactElement {
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  // The newest message in sight, as in any chat.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [turns.length, sending]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft.trim() === '' || sending) {
      return;
    }
    onSend(draft);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-3 pb-28">
      {turns.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-surface p-3.5 text-[14px] text-muted shadow-card">
            {labels.assistant.intro}
          </p>
          <div className="flex flex-wrap gap-2">
            {labels.assistant.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={sending}
                onClick={() => {
                  onSend(suggestion);
                }}
                className="min-h-10 rounded-full bg-primary-soft px-3.5 text-[14px] font-medium text-primary active:opacity-70"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                turn.role === 'user'
                  ? 'self-end rounded-ee-md bg-primary text-white'
                  : 'self-start rounded-es-md bg-surface shadow-card'
              }`}
            >
              {turn.text}
            </li>
          ))}
          {sending && (
            <li className="self-start rounded-2xl rounded-es-md bg-surface px-3.5 py-2.5 text-[15px] text-muted shadow-card">
              {labels.assistant.thinking}
            </li>
          )}
        </ul>
      )}
      {turns.length > 0 && (
        <div className="self-center">
          <ConfirmButton
            label={labels.assistant.clear}
            confirmLabel={labels.assistant.confirmClear}
            onConfirm={onClear}
          />
        </div>
      )}
      <div ref={end} />
      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl items-end gap-2 bg-paper/95 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md"
      >
        <textarea
          value={draft}
          rows={1}
          dir="auto"
          aria-label={labels.assistant.placeholder}
          placeholder={labels.assistant.placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none field-sizing-content focus:border-primary"
        />
        <button
          type="submit"
          aria-label={labels.assistant.send}
          disabled={draft.trim() === '' || sending}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition active:scale-95 disabled:bg-line disabled:text-faint"
        >
          <Icon name="send" className="size-5" />
        </button>
      </form>
    </div>
  );
}
