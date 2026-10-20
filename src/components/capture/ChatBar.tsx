import { useEffect, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { useQuickAsk } from '../../hooks/useQuickAsk';
import { Icon } from '../ui/Icon';

/**
 * A line at the bottom of a screen to write to the assistant without leaving it: the answer
 * opens right above the line, with its buttons to what was done, and closes with ×. The
 * conversation keeps it, to go on there.
 */
type ChatBarProps = {
  /** Shows a "+" at the start of the bar that opens the add sheet. */
  readonly onNewItem?: () => void;
};

export function ChatBar({ onNewItem }: ChatBarProps): ReactElement {
  const quick = useQuickAsk();
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  const canSend = (draft.trim() !== '' || photo !== null) && !quick.sending;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSend) {
      return;
    }
    quick.ask(draft, photo);
    setDraft('');
    setPhoto(null);
  }

  const open = quick.sending || quick.answer !== null || quick.error !== null;

  return (
    <div className="flex flex-col gap-2">
      {open && (
        <section className="flex max-h-[45dvh] animate-fade-in flex-col gap-2 overflow-y-auto rounded-2xl bg-surface p-3.5 shadow-halo">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[13px] font-medium text-muted">
              {quick.answer?.question ?? (quick.sending ? labels.assistant.thinking : '')}
            </p>
            {!quick.sending && (
              <button
                type="button"
                aria-label={labels.actions.close}
                onClick={quick.close}
                className="-m-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 active:bg-line"
              >
                <Icon name="close" className="size-4.5" />
              </button>
            )}
          </div>
          {quick.sending && (
            <span className="flex gap-1 py-1" aria-hidden>
              <span className="size-2 animate-pulse rounded-full bg-primary/60" />
              <span className="size-2 animate-pulse rounded-full bg-primary/60 [animation-delay:150ms]" />
              <span className="size-2 animate-pulse rounded-full bg-primary/60 [animation-delay:300ms]" />
            </span>
          )}
          {quick.error !== null && <p className="text-[14px] text-alert">{quick.error}</p>}
          {quick.answer !== null && (
            <>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {quick.answer.reply}
              </p>
              <span className="flex flex-wrap gap-1.5">
                {quick.answer.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full bg-primary-soft ps-3 pe-2 text-[13px] font-medium text-primary transition active:scale-[0.97]"
                  >
                    <span className="truncate">{link.title}</span>
                    <Icon name="forward" className="size-3.5 shrink-0" />
                  </Link>
                ))}
                <Link
                  to="/assistant"
                  className="inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-muted transition active:scale-[0.97]"
                >
                  <Icon name="chat" className="size-3.5" />
                  {labels.assistant.continue}
                </Link>
              </span>
            </>
          )}
        </section>
      )}
      {preview !== null && (
        <div className="flex items-center gap-2.5">
          <img src={preview} alt="" className="size-11 rounded-xl object-cover shadow-card" />
          <p className="flex-1 text-[13px] text-muted">{labels.assistant.photoReady}</p>
          <button
            type="button"
            aria-label={labels.assistant.removePhoto}
            onClick={() => {
              setPhoto(null);
            }}
            className="flex size-9 items-center justify-center rounded-full text-muted transition active:scale-90"
          >
            <Icon name="close" className="size-4.5" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        {onNewItem !== undefined && (
          <button
            type="button"
            aria-label={labels.actions.newItem}
            onClick={onNewItem}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-float transition active:scale-90"
          >
            <Icon name="plus" className="size-6" />
          </button>
        )}
        <Link
          to="/assistant"
          aria-label={labels.assistant.open}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary shadow-halo transition active:scale-90"
        >
          <Icon name="chat" className="size-5.5" />
        </Link>
        <label
          aria-label={labels.assistant.attach}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary transition active:scale-90 active:bg-primary-soft"
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
        <input
          value={draft}
          dir="auto"
          aria-label={labels.assistant.barPlaceholder}
          placeholder={labels.assistant.barPlaceholder}
          enterKeyHint="send"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[15px] shadow-card outline-none focus:border-primary"
        />
        <button
          type="submit"
          aria-label={labels.assistant.send}
          disabled={!canSend}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition active:scale-90 disabled:text-faint"
        >
          <Icon name="send" className="size-5" />
        </button>
      </form>
    </div>
  );
}
