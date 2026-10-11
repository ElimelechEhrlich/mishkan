import { useCallback } from 'react';
import type { EntityWithDomains } from '../types/domain';
import type { UseEntities } from './useEntities';
import type { UseItems } from './useItems';

export type UseProfileHost = {
  /** The entity whose profile to show: a child, a parent or the couple; otherwise undefined. */
  readonly profileEntity: EntityWithDomains | undefined;
  /** After the profile is saved: reloads the entity, and the items for a reminder it changed. */
  readonly onProfileSaved: () => Promise<void>;
};

/** What a page needs to show the profile of the entity it is about. */
export function useProfileHost(
  entity: EntityWithDomains | undefined,
  entities: UseEntities,
  items: UseItems,
): UseProfileHost {
  const reloadEntities = entities.reload;
  const reloadItems = items.reload;
  const onProfileSaved = useCallback(async (): Promise<void> => {
    await reloadEntities();
    reloadItems();
  }, [reloadEntities, reloadItems]);

  const hasProfile =
    entity !== undefined &&
    (entity.kind === 'child' || entity.kind === 'parent' || entity.kind === 'couple');
  return { profileEntity: hasProfile ? entity : undefined, onProfileSaved };
}
