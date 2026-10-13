import type { ReactElement } from 'react';
import type { EntityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type ScopeAvatarProps = {
  /** The entity, or undefined for everything (the house). */
  readonly entity: EntityWithDomains | undefined;
  readonly tone: EntityTone;
  readonly raised: boolean;
};

/** The large picture of a carousel place, in its white ring: an entity, or everything. */
export function ScopeAvatar({ entity, tone, raised }: ScopeAvatarProps): ReactElement {
  return (
    <span
      className={`block rounded-full bg-surface p-1 ${raised ? 'shadow-raised' : 'shadow-card'}`}
    >
      {entity === undefined ? (
        <span className="flex size-24 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="home" className="size-10" />
        </span>
      ) : (
        <EntityAvatar entity={entity} tone={tone} size="hero" />
      )}
    </span>
  );
}
