import type { ReactElement } from 'react';
import type { EntityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';

type EntityAvatarProps = {
  readonly entity: Entity & { readonly avatarUrl?: string | null };
  readonly tone: EntityTone;
  readonly size: 'xs' | 'md' | 'list' | 'lg' | 'hero';
};

const sizes = {
  xs: { box: 'size-6 rounded-full text-xs', icon: 'size-3.5', emoji: 'text-sm' },
  md: { box: 'size-9 rounded-full text-[15px]', icon: 'size-4.5', emoji: 'text-xl' },
  list: { box: 'size-11 rounded-full text-lg', icon: 'size-5', emoji: 'text-2xl' },
  lg: { box: 'size-14 rounded-[18px] text-[26px]', icon: 'size-7', emoji: 'text-3xl' },
  hero: { box: 'size-24 rounded-full text-4xl', icon: 'size-10', emoji: 'text-5xl' },
} as const;

/**
 * The entity's picture: its photo, else its emoji, else its first letter on its color
 * (a lock for the private personal entity).
 */
export function EntityAvatar({ entity, tone, size }: EntityAvatarProps): ReactElement {
  const look = sizes[size];
  const photo = entity.avatarUrl ?? null;
  if (photo !== null) {
    return (
      <img
        src={photo}
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-cover ${look.box}`}
      />
    );
  }
  if (entity.avatar_emoji !== null) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center bg-cream ${look.box} ${look.emoji}`}
      >
        {entity.avatar_emoji}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-display font-bold text-white ${look.box} ${tone.bg}`}
    >
      {entity.kind === 'personal' ? (
        <Icon name="lock" className={look.icon} />
      ) : (
        entity.name.trim().charAt(0)
      )}
    </span>
  );
}
