import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasRowLists, readCache, writeCache } from '../lib/cache';
import { labels } from '../constants/labels';
import { toMessage, withTimeout } from '../lib/errors';
import { announceItemsChanged, onItemsChanged } from '../lib/itemChanges';
import { agendaOf, isItem, openOnly, parentIdsOf, todayIso, withPending } from '../lib/itemRules';
import type { Agenda } from '../lib/itemRules';
import {
  completeItem,
  convertItem,
  createAppointments,
  createItem,
  createQuestion,
  deleteItem,
  duplicateItem,
  listOpenItems,
  listSteps,
  reopenItem,
  undoComplete,
  subscribeToItems,
  updateItem,
} from '../services/itemService';
import { createDebt, updateDebtDetails } from '../services/debtService';
import { createMissingItem } from '../services/shoppingService';
import type {
  Conversion,
  DebtChanges,
  Item,
  ItemUpdate,
  NewAppointment,
  NewDebt,
  NewItem,
  NewMissingItem,
} from '../types/domain';
import { useItemReminders } from './useItemReminders';
import { useRepeats } from './useRepeats';
import { isLateStep } from '../lib/goals';
import type { UseItemReminders } from './useItemReminders';
import { useHouseholdContext } from './useRouteContext';
import { offerUndo } from './useUndoOffer';

type ItemsState = {
  readonly items: readonly Item[];
  readonly steps: readonly Item[];
  readonly loading: boolean;
  readonly error: string | null;
};

/** An item shown for attention, and why. */
export type AttentionEntry = {
  readonly item: Item;
  readonly reason: 'waitingReminder' | 'lateStep' | 'tripDone';
};

export type UseItems = {
  /** Every open item the parent can see. */
  readonly items: readonly Item[];
  /** Every step of a goal or an issue, done ones included. */
  readonly steps: readonly Item[];
  /** Open items that are fully assigned. */
  readonly assigned: readonly Item[];
  /** Open items still missing a domain or a time, that the current parent has to complete. */
  readonly incomplete: readonly Item[];
  /**
   * Fully assigned open items with something waiting on them: a reminder that waits for a date
   * or an hour, or a step later than its goal's date. Shown in "needs completion" for
   * attention, and in the lists as well.
   */
  readonly attention: readonly AttentionEntry[];
  /** How many items "needs completion" holds, for its badge. */
  readonly incompleteCount: number;
  /** The reminders of the items. */
  readonly reminders: UseItemReminders;
  /** What is late and what is due today, across the whole home. */
  readonly agenda: Agenda;
  /** How many items the agenda holds, late and today together. */
  readonly todayCount: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  readonly addItem: (newItem: NewItem) => Promise<boolean>;
  readonly addMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  readonly addDebt: (newDebt: NewDebt) => Promise<boolean>;
  readonly addAppointments: (appointment: NewAppointment) => Promise<boolean>;
  readonly addQuestion: (issueId: string, title: string) => void;
  readonly updateItem: (itemId: string, changes: ItemUpdate) => void;
  /** Changes a debt's amount, direction, importance or monthly plan. */
  readonly updateDebt: (itemId: string, changes: DebtChanges) => void;
  readonly convertItem: (itemId: string, conversion: Conversion) => Promise<boolean>;
  readonly completeItem: (item: Item) => void;
  readonly reopenItem: (itemId: string) => void;
  readonly deleteItem: (itemId: string) => Promise<boolean>;
  /** Makes a copy of the item; resolves to the copy's id, or null when it failed. */
  readonly duplicateItem: (itemId: string) => Promise<string | null>;
};

function isItemsSnapshot(
  value: unknown,
): value is { readonly items: Item[]; readonly steps: Item[] } {
  return hasRowLists(value, ['items', 'steps']);
}

export function useItems(): UseItems {
  const { member } = useHouseholdContext();
  const cacheKey = `items.${member.id}`;
  // What was loaded last time shows at once; the fresh copy replaces it when it arrives.
  const [state, setState] = useState<ItemsState>(() => {
    const cached = readCache(cacheKey, isItemsSnapshot);
    return cached === null
      ? { items: [], steps: [], loading: true, error: null }
      : { ...cached, loading: false, error: null };
  });

  // Loads can overlap (a change, then a return to the app); only the latest one is shown, so
  // an older answer arriving last does not undo a newer one.
  const latestLoad = useRef(0);
  // Changes still being saved, shown at once and kept over any list loaded meanwhile.
  const pending = useRef(new Map<string, ItemUpdate>());
  // The goals and issues known so far, so their steps load together with the open list.
  const knownParents = useRef<readonly string[]>(
    parentIdsOf(readCache(cacheKey, isItemsSnapshot)?.items ?? []),
  );
  const load = useCallback(async (): Promise<void> => {
    latestLoad.current += 1;
    const thisLoad = latestLoad.current;
    try {
      const asked = knownParents.current;
      const [items, early] = await Promise.all([listOpenItems(), listSteps(asked)]);
      const parents = parentIdsOf(items);
      knownParents.current = parents;
      // A goal or issue new since: its steps now; one closed since: its steps dropped.
      const wanted = new Set(parents);
      const late = await listSteps(parents.filter((id) => !asked.includes(id)));
      const steps = [...early, ...late]
        .filter((step) => step.parent_id !== null && wanted.has(step.parent_id))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (thisLoad !== latestLoad.current) {
        return;
      }
      setState({
        items: openOnly(withPending(items, pending.current)),
        steps: withPending(steps, pending.current),
        loading: false,
        error: null,
      });
      writeCache(cacheKey, { items, steps });
    } catch (error: unknown) {
      if (thisLoad === latestLoad.current) {
        setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
      }
    }
  }, [cacheKey]);

  const reload = useCallback((): void => {
    void load();
  }, [load]);

  /** How this list hears of a change made elsewhere in the app. */
  const reloadOnChange = useRef(reload);
  reloadOnChange.current = reload;

  useEffect(() => {
    void load();
    const stopServer = subscribeToItems(() => {
      void load();
    });
    const stopApp = onItemsChanged(reloadOnChange.current);
    return (): void => {
      stopServer();
      stopApp();
    };
  }, [load]);

  /** Reloads in the background and tells the app's other lists to; a failure is shown. */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await withTimeout(load());
      announceItemsChanged(reloadOnChange.current);
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, error: toMessage(error) }));
    }
  }, [load]);

  /**
   * Runs a change; what it added shows at once, and the lists catch up in the background, so
   * the screen is not held for them. With `waitForLists`, it returns only once they did.
   * A failure is reported in `error`, never swallowed.
   */
  const run = useCallback(
    async (change: () => Promise<unknown>, waitForLists = false): Promise<boolean> => {
      let added: readonly Item[] = [];
      try {
        const result = await withTimeout(change());
        added = Array.isArray(result) ? result.filter(isItem) : [];
      } catch (error: unknown) {
        setState((previous) => ({ ...previous, error: toMessage(error) }));
        return false;
      }
      if (added.length > 0) {
        setState((previous) => {
          const next = {
            ...previous,
            items: [...added.filter((item) => item.status === 'open'), ...previous.items],
            steps: [
              ...previous.steps,
              ...added.filter(
                (item) => item.parent_id !== null && knownParents.current.includes(item.parent_id),
              ),
            ],
          };
          writeCache(cacheKey, { items: next.items, steps: next.steps });
          return next;
        });
      }
      if (waitForLists) {
        await refresh();
      } else {
        void refresh();
      }
      return true;
    },
    [cacheKey, refresh],
  );

  const handleAdd = useCallback(
    (newItem: NewItem): Promise<boolean> => run(() => createItem(newItem)),
    [run],
  );

  const handleAddMissing = useCallback(
    (newItem: NewMissingItem): Promise<boolean> => run(() => createMissingItem(newItem)),
    [run],
  );

  const handleAddDebt = useCallback(
    (newDebt: NewDebt): Promise<boolean> => run(() => createDebt(newDebt)),
    [run],
  );

  const handleAddAppointments = useCallback(
    (appointment: NewAppointment): Promise<boolean> =>
      run(async () => {
        await createAppointments(appointment);
      }),
    [run],
  );

  const handleAddQuestion = useCallback(
    (issueId: string, title: string): void => {
      void run(() => createQuestion(issueId, title));
    },
    [run],
  );

  const handleConvert = useCallback(
    (itemId: string, conversion: Conversion): Promise<boolean> =>
      run(() => convertItem(itemId, conversion)),
    [run],
  );

  // The change shows the moment it is made; if saving it fails, it is taken back and said so.
  const handleUpdate = useCallback(
    (itemId: string, changes: ItemUpdate): void => {
      const merged = { ...pending.current.get(itemId), ...changes };
      pending.current.set(itemId, merged);
      setState((previous) => ({
        ...previous,
        items: withPending(previous.items, pending.current),
        steps: withPending(previous.steps, pending.current),
      }));
      const settle = (): void => {
        if (pending.current.get(itemId) === merged) {
          pending.current.delete(itemId);
        }
      };
      withTimeout(updateItem(itemId, changes))
        .then(async () => {
          settle();
          await withTimeout(load());
          announceItemsChanged(reloadOnChange.current);
        })
        .catch(async (error: unknown) => {
          settle();
          const message = toMessage(error);
          // Back to what is saved, with the reason kept on screen.
          await load().catch(() => undefined);
          setState((previous) => ({ ...previous, error: message }));
        });
    },
    [load],
  );

  const handleUpdateDebt = useCallback(
    (itemId: string, changes: DebtChanges): void => {
      void run(() => updateDebtDetails(itemId, changes));
    },
    [run],
  );

  // Marked done by mistake? For a few seconds it can be taken back.
  const handleComplete = useCallback(
    (item: Item): void => {
      // The occurrence marked, for a repeating task, so the offer to undo unmarks it.
      let occurrenceId: string | null = null;
      // What closes leaves the lists at once; a payment or a repeating date waits for them.
      const closes =
        !(item.kind === 'debt' && item.due_date !== null) &&
        !(item.time_mode === 'recurring' && item.due_date !== null);
      const marked: ItemUpdate = { status: 'done' };
      if (closes) {
        pending.current.set(item.id, { ...pending.current.get(item.id), ...marked });
        setState((previous) => ({
          ...previous,
          items: openOnly(withPending(previous.items, pending.current)),
          steps: withPending(previous.steps, pending.current),
        }));
      }
      void run(async () => {
        occurrenceId = await completeItem(item);
      }, closes).then((done) => {
        if (closes) {
          pending.current.delete(item.id);
          if (!done) {
            void load();
          }
        }
        if (done) {
          offerUndo(labels.undo.done, () => {
            void run(() => undoComplete(item, occurrenceId));
          });
        }
      });
    },
    [run, load],
  );

  const handleReopen = useCallback(
    (itemId: string): void => {
      void run(() => reopenItem(itemId));
    },
    [run],
  );

  const handleDelete = useCallback(
    (itemId: string): Promise<boolean> => run(() => deleteItem(itemId)),
    [run],
  );

  const handleDuplicate = useCallback(
    async (itemId: string): Promise<string | null> => {
      let copyId: string | null = null;
      const done = await run(async () => {
        copyId = await duplicateItem(itemId);
      }, true);
      return done ? copyId : null;
    },
    [run],
  );

  const assigned = useMemo(() => state.items.filter((item) => item.is_complete), [state.items]);
  const incomplete = useMemo(
    // Both parents see everything that waits to be completed, whoever opened it; what is
    // private (the parent's own entity) the database shows to its owner alone.
    // A step, question or tracker takes its domain from its goal or issue, so one that only
    // lacks a domain waits for its parent to be assigned, and is not listed on its own.
    () =>
      state.items.filter(
        (item) => !item.is_complete && !(item.parent_id !== null && item.domain_id === null),
      ),
    [state.items],
  );

  const reminders = useItemReminders();
  const repeats = useRepeats();
  const attention = useMemo((): AttentionEntry[] => {
    const listed = new Set(incomplete.map((item) => item.id));
    const waiting = state.items
      .filter((item) => reminders.waitingItemIds.has(item.id) && !listed.has(item.id))
      .map((item) => ({ item, reason: 'waitingReminder' as const }));
    const goals = new Map(
      state.items.filter((item) => item.kind === 'goal').map((goal) => [goal.id, goal]),
    );
    const late = state.steps
      .filter((step) => {
        const goal = step.parent_id === null ? undefined : goals.get(step.parent_id);
        return (
          goal !== undefined &&
          !listed.has(step.id) &&
          !reminders.waitingItemIds.has(step.id) &&
          isLateStep(step, goal, repeats.byItem.get(step.id), repeats.counts.get(step.id))
        );
      })
      .map((item) => ({ item, reason: 'lateStep' as const }));
    // A run of its list finished while going out shopping was open: close it?
    const trips = state.items
      .filter((item) => item.shopping_trip !== null && item.trip_run_done_at !== null)
      .map((item) => ({ item, reason: 'tripDone' as const }));
    return [...trips, ...waiting, ...late];
  }, [state.items, state.steps, incomplete, reminders.waitingItemIds, repeats]);

  const agenda = useMemo(
    () => agendaOf(assigned, state.steps, todayIso()),
    [assigned, state.steps],
  );

  return {
    items: state.items,
    steps: state.steps,
    assigned,
    incomplete,
    attention,
    incompleteCount: incomplete.length + attention.length,
    reminders,
    agenda,
    todayCount: agenda.overdue.length + agenda.urgent.length + agenda.today.length,
    loading: state.loading,
    error: state.error,
    reload,
    addItem: handleAdd,
    addMissingItem: handleAddMissing,
    addDebt: handleAddDebt,
    addAppointments: handleAddAppointments,
    addQuestion: handleAddQuestion,
    updateItem: handleUpdate,
    updateDebt: handleUpdateDebt,
    convertItem: handleConvert,
    completeItem: handleComplete,
    reopenItem: handleReopen,
    deleteItem: handleDelete,
    duplicateItem: handleDuplicate,
  };
}
