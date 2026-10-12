import { useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { labels } from '../../constants/labels';
import type { EntityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { AvatarPicker } from './AvatarPicker';
import { EntityAvatar } from './EntityAvatar';
import { EntityProfileCard } from './EntityProfileCard';

type EntitySheetProps = {
  readonly entity: EntityWithDomains;
  readonly tone: EntityTone;
  /** Reloads the entities after the picture or the profile changes. */
  readonly onEntityChanged: () => Promise<void>;
  readonly onClose: () => void;
};

/** Whether an entity has a profile: a child, a parent or the couple. */
function hasProfile(entity: EntityWithDomains): boolean {
  return entity.kind === 'child' || entity.kind === 'parent' || entity.kind === 'couple';
}

/**
 * Everything about one entity, opened from its picture: the picture itself (tap to change it),
 * and for a child, a parent or the couple the whole profile, unfolded.
 */
export function EntitySheet({
  entity,
  tone,
  onEntityChanged,
  onClose,
}: EntitySheetProps): ReactElement {
  const [picking, setPicking] = useState(false);

  // Drawn at the end of the page, above the header and the bottom bar.
  return createPortal(
    <div
      className="fixed inset-0 z-30 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={entity.name}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="mx-auto flex max-h-[90dvh] w-full max-w-xl animate-sheet-up flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-paper px-4 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-sheet"
      >
        <span className="mx-auto h-1 w-9 shrink-0 rounded-full bg-line" />
        <div className="flex justify-start">
          <IconButton icon="close" label={labels.actions.close} onClick={onClose} />
        </div>
        <div className="-mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label={labels.avatar.change}
            onClick={() => {
              setPicking(true);
            }}
            className="relative rounded-full transition active:scale-95"
          >
            <EntityAvatar entity={entity} tone={tone} size="hero" />
            <span className="absolute end-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-paper bg-surface text-muted shadow-card">
              <Icon name="edit" className="size-4" />
            </span>
          </button>
          <span className="font-display text-xl font-bold">{entity.name}</span>
          <span className="text-[13px] text-muted">{labels.entityKind[entity.kind]}</span>
        </div>
        {hasProfile(entity) && (
          <EntityProfileCard
            key={`sheet-profile-${entity.id}`}
            entity={entity}
            onEntityChanged={onEntityChanged}
            defaultExpanded
          />
        )}
      </div>
      {picking && (
        <AvatarPicker
          entity={entity}
          tone={tone}
          onChanged={onEntityChanged}
          onClose={() => {
            setPicking(false);
          }}
        />
      )}
    </div>,
    document.body,
  );
}
