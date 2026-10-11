import type { ReactElement } from 'react';
import type { EntityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';

type EntityAvatarProps = {
  readonly entity: Entity;
  readonly tone: EntityTone;
  readonly size: 'xs' | 'md' | 'lg';
};

const sizes = {
  xs: { box: 'size-6 rounded-full text-xs', icon: 'size-3.5' },
  md: { box: 'size-9 rounded-full text-[15px]', icon: 'size-4.5' },
  lg: { box: 'size-14 rounded-[18px] text-[26px]', icon: 'size-7' },
} as const;

/** The entity's first letter on its color; a lock for the private personal entity. */
export function EntityAvatar({ entity, tone, size }: EntityAvatarProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-display font-bold text-white ${sizes[size].box} ${tone.bg}`}
    >
      {entity.kind === 'personal' ? (
        <Icon name="lock" className={sizes[size].icon} />
      ) : (
        entity.name.trim().charAt(0)
      )}
    </span>
  );
}
