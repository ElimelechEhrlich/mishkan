import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { EntityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { AvatarPicker } from './AvatarPicker';
import { EntityAvatar } from './EntityAvatar';

type EntityHeadingProps = {
  readonly entity: EntityWithDomains;
  readonly tone: EntityTone;
  readonly openCount: number;
  /** Reloads the entities after the picture changes. */
  readonly onAvatarChanged: () => Promise<void>;
};

/**
 * The top of an entity's page: its picture (tap to change it), name, kind and how many
 * items are open.
 */
export function EntityHeading({
  entity,
  tone,
  openCount,
  onAvatarChanged,
}: EntityHeadingProps): ReactElement {
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex items-center gap-3.5">
      <button
        type="button"
        aria-label={labels.avatar.change}
        onClick={() => {
          setPicking(true);
        }}
        className="relative shrink-0 transition active:scale-95"
      >
        <EntityAvatar entity={entity} tone={tone} size="lg" />
        <span className="absolute -end-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-paper bg-surface text-muted shadow-card">
          <Icon name="edit" className="size-3" />
        </span>
      </button>
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate font-display text-[26px] leading-8 font-bold tracking-tight">
          {entity.name}
        </h1>
        <p className="text-[13px] text-muted">
          {labels.entityKind[entity.kind]}
          {labels.item.separator}
          {String(openCount)} {labels.entityPage.openItems}
        </p>
      </div>
      {picking && (
        <AvatarPicker
          entity={entity}
          tone={tone}
          onChanged={onAvatarChanged}
          onClose={() => {
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
