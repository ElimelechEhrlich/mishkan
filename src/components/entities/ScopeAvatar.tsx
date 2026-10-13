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
  /** Extra classes, such as the ones that dock or fade it as the page scrolls. */
  readonly className?: string;
};

/** The large picture of a carousel place, in its white ring: an entity, or everything. */
export function ScopeAvatar({
  entity,
  tone,
  raised,
  className = '',
}: ScopeAvatarProps): ReactElement {
  return (
    <span
      className={`block rounded-full bg-surface p-1 ${raised ? 'shadow-raised' : 'shadow-card'} ${className}`}
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
