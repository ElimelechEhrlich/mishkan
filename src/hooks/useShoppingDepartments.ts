import { useCallback, useEffect, useMemo, useState } from 'react';
import { readCache, writeCache } from '../lib/cache';
import { titleKey } from '../lib/departments';
import { toMessage } from '../lib/errors';
import {
  addDepartment,
  chooseItemDepartment,
  deleteDepartment,
  listDepartments,
  listItemDepartments,
  orderDepartments,
  renameDepartment,
} from '../services/departmentService';
import type { ItemDepartment, ShoppingDepartment } from '../types/domain';
import { useHouseholdContext } from './useRouteContext';

export type UseShoppingDepartments = {
  /** The household's departments, in the order the shop is walked. */
  readonly departments: readonly ShoppingDepartment[];
  /** An item's name (as `titleKey`) to the department chosen for it. */
  readonly chosen: ReadonlyMap<string, string>;
  readonly loaded: boolean;
  readonly add: (name: string) => void;
  readonly rename: (departmentId: string, name: string) => void;
  readonly remove: (departmentId: string) => void;
  /** Every department, in the new order; shown at once, saved for every run after. */
  readonly reorder: (departmentIds: readonly string[]) => void;
  /** Puts an item's name in a department from now on; null goes back to the built-in one. */
  readonly choose: (title: string, departmentId: string | null) => void;
  readonly error: string | null;
};

type Snapshot = {
  readonly departments: ShoppingDepartment[];
  readonly chosen: ItemDepartment[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSnapshot(value: unknown): value is Snapshot {
  return (
    isObject(value) &&
    Array.isArray(value['departments']) &&
    value['departments'].every((row: unknown) => isObject(row) && typeof row['id'] === 'string') &&
    Array.isArray(value['chosen']) &&
    value['chosen'].every(
      (row: unknown) =>
        isObject(row) &&
        typeof row['title_key'] === 'string' &&
        typeof row['department_id'] === 'string',
    )
  );
}

/** The supermarket's departments and what was chosen for items, kept on the device too. */
export function useShoppingDepartments(): UseShoppingDepartments {
  const { member } = useHouseholdContext();
  const cacheKey = `departments.${member.household_id}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => readCache(cacheKey, isSnapshot));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [departments, chosen] = await Promise.all([listDepartments(), listItemDepartments()]);
      const fresh = { departments, chosen };
      setSnapshot(fresh);
      setError(null);
      writeCache(cacheKey, fresh);
    } catch (caught: unknown) {
      setError(toMessage(caught));
    }
  }, [cacheKey]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs a change, then loads again: what was shown at once is replaced by what was saved. */
  const run = useCallback(
    (change: () => Promise<void>): void => {
      change()
        .then(() => load())
        .catch((caught: unknown) => {
          setError(toMessage(caught));
          void load();
        });
    },
    [load],
  );

  const reorder = useCallback(
    (departmentIds: readonly string[]): void => {
      setSnapshot((current) =>
        current === null
          ? null
          : {
              ...current,
              departments: current.departments
                .map((department) => ({
                  ...department,
                  position: departmentIds.indexOf(department.id) + 1,
                }))
                .sort((a, b) => a.position - b.position),
            },
      );
      run(() => orderDepartments(departmentIds));
    },
    [run],
  );

  const choose = useCallback(
    (title: string, departmentId: string | null): void => {
      const key = titleKey(title);
      setSnapshot((current) =>
        current === null
          ? null
          : {
              ...current,
              chosen: [
                ...current.chosen.filter((row) => row.title_key !== key),
                ...(departmentId === null
                  ? []
                  : [
                      {
                        household_id: member.household_id,
                        title_key: key,
                        department_id: departmentId,
                      },
                    ]),
              ],
            },
      );
      run(() => chooseItemDepartment(key, departmentId));
    },
    [run, member.household_id],
  );

  const chosen = useMemo(
    () => new Map((snapshot?.chosen ?? []).map((row) => [row.title_key, row.department_id])),
    [snapshot],
  );

  return {
    departments: snapshot?.departments ?? [],
    chosen,
    loaded: snapshot !== null,
    add: (name): void => {
      run(() => addDepartment(name));
    },
    rename: (departmentId, name): void => {
      run(() => renameDepartment(departmentId, name));
    },
    remove: (departmentId): void => {
      run(() => deleteDepartment(departmentId));
    },
    reorder,
    choose,
    error,
  };
}
