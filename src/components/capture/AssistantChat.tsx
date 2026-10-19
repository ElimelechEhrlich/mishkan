import { useEffect, useRef, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { AssistantTurn } from '../../services/assistantService';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon } from '../ui/Icon';

type AssistantChatProps = {
  readonly turns: readonly AssistantTurn[];
  readonly sending: boolean;
  readonly onSend: (message: string, photo?: File | null) => void;
  /** Sends again the last message, which got no answer; null when there is none. */
  readonly onRetry: (() => void) | null;
  readonly onClear: () => void;
  /** A photo brought from another screen, attached and waiting to be sent. */
  readonly initialPhoto?: File | null;
};

/**
 * A conversation with the assistant: the parent's messages on one side, its answers on the
 * other, a few ready questions to start with, and a line to write in at the bottom.
 */
export function AssistantChat({
  turns,
  sending,
  onSend,
  onRetry,
  onClear,
  initialPhoto = null,
}: AssistantChatProps): ReactElement {
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<File | null>(initialPhoto);
  const [preview, setPreview] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // A photo brought from another screen arrives once the conversation is open.
  useEffect(() => {
    if (initialPhoto !== null) {
      setPhoto(initialPhoto);
    }
  }, [initialPhoto]);

  // A small picture of the attached photo, let go once it is sent or removed.
  useEffect(() => {
    if (photo === null) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return (): void => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  const canRetry = onRetry !== null;
  // The newest message in sight, as in any chat.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [turns.length, sending, canRetry]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if ((draft.trim() === '' && photo === null) || sending) {
      return;
    }
    onSend(draft, photo);
    setDraft('');
    setPhoto(null);
  }

  return (
    <div className="flex flex-col gap-3 pb-44">
      {turns.length === 0 && !sending ? (
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
              className={`flex max-w-[85%] flex-col gap-2 ${turn.role === 'user' ? 'self-end' : 'self-start'}`}
            >
              <span
                className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  turn.role === 'user'
                    ? 'rounded-ee-md bg-primary text-white'
                    : 'rounded-es-md bg-surface shadow-card'
                }`}
              >
                {turn.text}
              </span>
              {/* What it just did, a tap away: to check it, or add to it. */}
              {turn.links.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {turn.links.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-medium text-primary"
                    >
                      <span className="truncate">{link.title}</span>
                      <Icon name="forward" className="size-3.5 shrink-0" />
                    </Link>
                  ))}
                </span>
              )}
            </li>
          ))}
          {onRetry !== null && (
            <li className="flex items-center gap-2 self-end text-[13px] text-muted">
              <span>{labels.assistant.notAnswered}</span>
              <button
                type="button"
                onClick={onRetry}
                className="flex min-h-9 items-center gap-1 rounded-full bg-primary-soft px-3 font-semibold text-primary active:opacity-70"
              >
                {labels.assistant.retry}
              </button>
            </li>
          )}
          {sending && (
            <li
              role="status"
              aria-label={labels.assistant.thinking}
              className="flex items-center gap-1.5 self-start rounded-2xl rounded-es-md bg-surface px-4 py-3.5 shadow-card"
            >
              {/* Three dots rising one after another, as a chat shows the other side writing. */}
              {[0, 160, 320].map((delay) => (
                <span
                  key={delay}
                  style={{ animationDelay: `${String(delay)}ms` }}
                  className="size-2 animate-typing rounded-full bg-primary/60"
                />
              ))}
            </li>
          )}
        </ul>
      )}
      {turns.length > 0 && !sending && (
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
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl flex-col gap-2 bg-paper/95 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md"
      >
        {preview !== null && (
          <div className="flex items-center gap-2.5">
            <img src={preview} alt="" className="size-14 rounded-xl object-cover shadow-card" />
            <p className="flex-1 text-[13px] text-muted">{labels.assistant.photoReady}</p>
            <button
              type="button"
              aria-label={labels.assistant.removePhoto}
              onClick={() => {
                setPhoto(null);
              }}
              className="flex size-9 items-center justify-center rounded-full text-muted active:bg-line"
            >
              <Icon name="close" className="size-4.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label
            aria-label={labels.assistant.attach}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary active:bg-primary-soft"
          >
            <Icon name="clip" className="size-5.5" />
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                setPhoto(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
          </label>
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
            disabled={(draft.trim() === '' && photo === null) || sending}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition active:scale-95 disabled:bg-line disabled:text-faint"
          >
            <Icon name="send" className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
