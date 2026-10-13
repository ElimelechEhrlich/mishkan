import { useCallback, useState } from 'react';
import { childPlacesAfterMove } from '../lib/childOrder';
import { toMessage } from '../lib/errors';
import {
  createDomain,
  clearChildPositions,
  createEntity,
  deleteDomain,
  deleteEntity,
  renameEntity,
  setChildPositions,
  updateDomain,
} from '../services/entityService';
import type { AddableEntityKind, Domain, Entity, EntityWithDomains, Member } from '../types/domain';

export type UseEntitySettings = {
  readonly error: string | null;
  readonly addEntity: (kind: AddableEntityKind, name: string) => void;
  readonly renameEntity: (entity: Entity, name: string) => void;
  readonly removeEntity: (entity: Entity) => void;
  /** Moves a child one place up or down among the children. */
  readonly moveChild: (entity: Entity, step: -1 | 1) => void;
  /** Whether a parent ordered the children by hand, rather than by age. */
  readonly childrenPlaced: boolean;
  readonly sortChildrenByAge: () => void;
  readonly addDomain: (entity: EntityWithDomains, name: string) => void;
  readonly addDebtsDomain: (entity: EntityWithDomains, name: string) => void;
  readonly renameDomain: (domain: Domain, name: string) => void;
  readonly removeDomain: (domain: Domain) => void;
};

/** One more than the highest sort order, to place a new row last. */
export function nextSortOrder(rows: readonly { readonly sort_order: number }[]): number {
  return rows.reduce((highest, row) => Math.max(highest, row.sort_order), 0) + 1;
}

/** Adding, renaming and removing entities and their domains. */
export function useEntitySettings(
  member: Member,
  entities: readonly EntityWithDomains[],
  reload: () => Promise<void>,
): UseEntitySettings {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (change: () => Promise<unknown>): void => {
      change()
        .then(reload)
        .then(() => {
          setError(null);
        })
        .catch((caught: unknown) => {
          setError(toMessage(caught));
        });
    },
    [reload],
  );

  return {
    error,
    addEntity: (kind, name): void => {
      run(() =>
        createEntity({
          householdId: member.household_id,
          kind,
          name,
          sortOrder: nextSortOrder(entities),
        }),
      );
    },
    renameEntity: (entity, name): void => {
      run(() => renameEntity(entity.id, name));
    },
    removeEntity: (entity): void => {
      run(() => deleteEntity(entity.id));
    },
    moveChild: (entity, step): void => {
      const places = childPlacesAfterMove(entities, entity.id, step);
      if (places !== null) {
        run(() => setChildPositions(places));
      }
    },
    childrenPlaced: entities.some((entity) => entity.kind === 'child' && entity.position !== null),
    sortChildrenByAge: (): void => {
      run(() =>
        clearChildPositions(
          entities.filter((entity) => entity.kind === 'child').map((entity) => entity.id),
        ),
      );
    },
    addDomain: (entity, name): void => {
      run(() =>
        createDomain({
          entityId: entity.id,
          name,
          role: 'regular',
          sortOrder: nextSortOrder(entity.domains),
        }),
      );
    },
    addDebtsDomain: (entity, name): void => {
      run(() =>
        createDomain({
          entityId: entity.id,
          name,
          role: 'debts',
          sortOrder: nextSortOrder(entity.domains),
        }),
      );
    },
    renameDomain: (domain, name): void => {
      run(() => updateDomain(domain.id, { name }));
    },
    removeDomain: (domain): void => {
      run(() => deleteDomain(domain.id));
    },
  };
}
