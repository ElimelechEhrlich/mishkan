import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  createArea,
  createDomain,
  deleteArea,
  deleteDomain,
  updateArea,
  updateDomain,
} from '../services/areaService';
import type { Area, AreaWithDomains, Domain, Member } from '../types/domain';

export type UseAreaSettings = {
  readonly error: string | null;
  readonly addArea: (name: string) => void;
  readonly renameArea: (area: Area, name: string) => void;
  readonly setAreaPrivate: (area: Area, isPrivate: boolean) => void;
  readonly removeArea: (area: Area) => void;
  readonly addDomain: (area: AreaWithDomains, name: string) => void;
  readonly renameDomain: (domain: Domain, name: string) => void;
  readonly setDomainPrivate: (domain: Domain, isPrivate: boolean) => void;
  readonly removeDomain: (domain: Domain) => void;
};

function nextSortOrder(rows: readonly { readonly sort_order: number }[]): number {
  return rows.reduce((highest, row) => Math.max(highest, row.sort_order), 0) + 1;
}

/** Editing of areas and domains. Private ones belong to the parent who marks them. */
export function useAreaSettings(
  member: Member,
  areas: readonly AreaWithDomains[],
  reload: () => Promise<void>,
): UseAreaSettings {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (change: () => Promise<void>): void => {
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

  const privacy = useCallback(
    (isPrivate: boolean) =>
      isPrivate
        ? ({ visibility: 'private', owner_id: member.id } as const)
        : ({ visibility: 'household', owner_id: null } as const),
    [member.id],
  );

  return {
    error,
    addArea: (name): void => {
      run(() =>
        createArea({ householdId: member.household_id, name, sortOrder: nextSortOrder(areas) }),
      );
    },
    renameArea: (area, name): void => {
      run(() => updateArea(area.id, { name }));
    },
    setAreaPrivate: (area, isPrivate): void => {
      run(() => updateArea(area.id, privacy(isPrivate)));
    },
    removeArea: (area): void => {
      run(() => deleteArea(area.id));
    },
    addDomain: (area, name): void => {
      run(() => createDomain({ areaId: area.id, name, sortOrder: nextSortOrder(area.domains) }));
    },
    renameDomain: (domain, name): void => {
      run(() => updateDomain(domain.id, { name }));
    },
    setDomainPrivate: (domain, isPrivate): void => {
      run(() => updateDomain(domain.id, privacy(isPrivate)));
    },
    removeDomain: (domain): void => {
      run(() => deleteDomain(domain.id));
    },
  };
}
