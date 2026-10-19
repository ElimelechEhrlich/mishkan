import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { labels } from '../../constants/labels';
import type { ChatHandoff } from '../../hooks/useChatHandoff';
import { Icon } from '../ui/Icon';

/**
 * A line at the bottom of a screen to write to the assistant without opening it first: what
 * is written is sent at once in the conversation, and a photo opens there attached, ready
 * for a word before it goes.
 */
export function ChatBar(): ReactElement {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');

  function handOff(handoff: ChatHandoff): void {
    void navigate('/assistant', { state: handoff });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = draft.trim();
    if (message === '') {
      return;
    }
    setDraft('');
    handOff({ message, photo: null });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
            const photo = event.target.files?.[0] ?? null;
            event.target.value = '';
            if (photo !== null) {
              handOff({ message: null, photo });
            }
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
        disabled={draft.trim() === ''}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition active:scale-90 disabled:text-faint"
      >
        <Icon name="send" className="size-5" />
      </button>
    </form>
  );
}
