import { useCallback, useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import { todayIso } from '../lib/itemRules';
import { occasionFacts, occasionOf, occasionReminders } from '../lib/occasions';
import type { Occasion, OccasionFacts } from '../lib/occasions';
import {
  addListValue,
  createProfileList,
  deleteListValue,
  deleteProfileList,
  listProfileLists,
  syncAutoReminder,
  updateEntityProfile,
} from '../services/profileService';
import type { EntityUpdate, EntityWithDomains, ProfileList } from '../types/domain';

type ProfileState = {
  readonly lists: readonly ProfileList[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseEntityProfile = ProfileState & {
  /** The birthday or wedding day, when its date is set. */
  readonly occasion: Occasion | null;
  readonly facts: OccasionFacts | null;
  /**
   * Saves profile fields and brings the reminder of a changed date up to date at once,
   * then reloads through `onEntityChanged`.
   */
  readonly update: (changes: EntityUpdate) => void;
  readonly addList: (title: string) => void;
  readonly removeList: (listId: string) => void;
  readonly addValue: (listId: string, value: string) => void;
  readonly removeValue: (valueId: string) => void;
};

/** The profile of an entity: its fields and its open lists, such as hobbies. */
export function useEntityProfile(
  entity: EntityWithDomains,
  onEntityChanged: () => Promise<void>,
): UseEntityProfile {
  const entityId = entity.id;
  const [state, setState] = useState<ProfileState>({ lists: [], loading: true, error: null });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const lists = await listProfileLists(entityId);
      setState({ lists, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
    }
  }, [entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Runs a change, then reloads. A failure is reported in `error`, never swallowed. */
  const run = useCallback((change: () => Promise<void>, after: () => Promise<void>): void => {
    void (async (): Promise<void> => {
      try {
        await change();
        await after();
      } catch (error: unknown) {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
      }
    })();
  }, []);

  const update = useCallback(
    (changes: EntityUpdate): void => {
      run(async () => {
        await updateEntityProfile(entityId, changes);
        const reminders = occasionReminders([{ ...entity, ...changes }], todayIso());
        await Promise.all(reminders.map((reminder) => syncAutoReminder(reminder)));
      }, onEntityChanged);
    },
    [run, entity, entityId, onEntityChanged],
  );

  const addList = useCallback(
    (title: string): void => {
      const sortOrder = Math.max(0, ...state.lists.map((list) => list.sort_order)) + 1;
      run(() => createProfileList(entityId, title, sortOrder), reload);
    },
    [run, entityId, state.lists, reload],
  );

  const removeList = useCallback(
    (listId: string): void => {
      run(() => deleteProfileList(listId), reload);
    },
    [run, reload],
  );

  const addValue = useCallback(
    (listId: string, value: string): void => {
      run(() => addListValue(listId, value), reload);
    },
    [run, reload],
  );

  const removeValue = useCallback(
    (valueId: string): void => {
      run(() => deleteListValue(valueId), reload);
    },
    [run, reload],
  );

  const occasion = useMemo(() => occasionOf(entity), [entity]);
  const facts = useMemo(
    () => (occasion === null ? null : occasionFacts(occasion, todayIso())),
    [occasion],
  );

  return { ...state, occasion, facts, update, addList, removeList, addValue, removeValue };
}
