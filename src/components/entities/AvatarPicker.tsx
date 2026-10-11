import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useEntityAvatar } from '../../hooks/useEntityAvatar';
import type { EntityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { EntityAvatar } from './EntityAvatar';

type AvatarPickerProps = {
  readonly entity: EntityWithDomains;
  readonly tone: EntityTone;
  readonly onChanged: () => Promise<void>;
  readonly onClose: () => void;
};

/** A sheet for an entity's picture: a photo from the phone, an emoji, or the letter. */
export function AvatarPicker({
  entity,
  tone,
  onChanged,
  onClose,
}: AvatarPickerProps): ReactElement {
  const avatar = useEntityAvatar(entity, onChanged);
  const fileInput = useRef<HTMLInputElement>(null);

  async function done(saved: Promise<boolean>): Promise<void> {
    if (await saved) {
      onClose();
    }
  }

  // Drawn at the end of the page: inside the blurred header it would be cut to its size.
  return createPortal(
    <div
      className="fixed inset-0 z-30 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.avatar.title}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="mx-auto flex max-h-[88dvh] w-full max-w-xl animate-sheet-up flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-surface px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-sheet"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{labels.avatar.title}</h2>
          <IconButton icon="close" label={labels.actions.close} onClick={onClose} />
        </div>
        <div className={`flex justify-center ${avatar.busy ? 'animate-pulse' : ''}`}>
          <EntityAvatar entity={entity} tone={tone} size="hero" />
        </div>
        <ErrorBanner message={avatar.error} />

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file !== undefined) {
              void done(avatar.choosePhoto(file));
            }
          }}
        />
        <button
          type="button"
          disabled={avatar.busy}
          onClick={() => {
            fileInput.current?.click();
          }}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          <Icon name="clip" className="size-5" />
          {labels.avatar.photo}
        </button>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-wide text-muted">{labels.avatar.emoji}</span>
          <div className="grid grid-cols-6 gap-2">
            {labels.avatar.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={avatar.busy}
                aria-pressed={entity.avatar_emoji === emoji}
                onClick={() => {
                  void done(avatar.chooseEmoji(emoji));
                }}
                className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition active:scale-90 ${
                  entity.avatar_emoji === emoji ? 'bg-primary-soft ring-2 ring-primary' : 'bg-paper'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {(entity.avatar_emoji !== null || entity.avatar_path !== null) && (
          <button
            type="button"
            disabled={avatar.busy}
            onClick={() => {
              void done(avatar.chooseEmoji(null));
            }}
            className="min-h-11 text-[15px] font-medium text-muted"
          >
            {labels.avatar.letter}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
