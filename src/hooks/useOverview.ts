import { useMemo } from 'react';
import {
  rowsOfSegment,
  sectionOfEntry,
  shoppingCategories,
  todayIso,
  toListEntries,
} from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item, OpenSegment, ShoppingCategory } from '../types/domain';
import { useDebts } from './useDebts';

export type TimeGroups = Readonly<Record<OpenSegment, readonly ListEntry[]>>;

export type Overview = {
  readonly tasks: TimeGroups;
  readonly goals: TimeGroups;
  /** Open issues, dated by their open steps. */
  readonly issues: readonly ListEntry[];
  /** Open appointments; they always have a day. */
  readonly appointments: readonly ListEntry[];
  /** Notes, newest first. */
  readonly notes: readonly ListEntry[];
  /** Missing items not in a run, by category, only the categories that have some. */
  readonly shopping: readonly { readonly category: ShoppingCategory; readonly count: number }[];
  readonly shoppingCount: number;
  readonly owedToUs: number;
  readonly weOwe: number;
  readonly debtCount: number;
  /** Tasks, goals and appointments that are late, and due today, counting a goal by its earliest open step. */
  readonly overdue: number;
  /** Marked urgent, with no date or a later one. */
  readonly urgent: number;
  readonly today: number;
  /** Due from tomorrow to a week from today. */
  readonly thisWeek: number;
};

/**
 * One kind's rows in each time group. A step goes inside its goal when the goal is in the
 * same group (on any card), and stands on its own when it is not.
 */
function byTime(
  bySegment: Readonly<Record<OpenSegment, readonly Item[]>>,
  kind: Item['kind'],
  steps: readonly Item[],
  assigned: readonly Item[],
): TimeGroups {
  const group = (segment: OpenSegment): readonly ListEntry[] =>
    toListEntries(
      bySegment[segment].filter((item) => item.kind === kind),
      steps,
      assigned,
    );
  return { active: group('active'), waiting: group('waiting'), someday: group('someday') };
}

function sum(amounts: readonly { readonly details: { readonly amount: number } }[]): number {
  return amounts.reduce((total, debt) => total + debt.details.amount, 0);
}

/**
 * Everything open, summed up for the main page: tasks and goals by time, notes,
 * what is missing by category, and debts. `items` and `assigned` are already narrowed
 * to the chosen entity.
 */
export function useOverview(
  items: readonly Item[],
  assigned: readonly Item[],
  steps: readonly Item[],
): Overview {
  const debts = useDebts(items);

  const timed = useMemo(() => {
    const bySegment = {
      active: rowsOfSegment(assigned, 'active'),
      waiting: rowsOfSegment(assigned, 'waiting'),
      someday: rowsOfSegment(assigned, 'someday'),
    };
    const tasks = byTime(bySegment, 'task', steps, assigned);
    const goals = byTime(bySegment, 'goal', steps, assigned);
    const issues = toListEntries(
      bySegment.active.filter((item) => item.kind === 'issue'),
      steps,
    );
    const appointments = toListEntries(
      bySegment.active.filter((item) => item.kind === 'appointment'),
      [],
    );
    const today = todayIso();
    const active = [...tasks.active, ...goals.active, ...issues, ...appointments];
    return {
      tasks,
      goals,
      issues,
      appointments,
      overdue: active.filter((entry) => sectionOfEntry(entry, today) === 'overdue').length,
      urgent: active.filter((entry) => sectionOfEntry(entry, today) === 'urgent').length,
      today: active.filter((entry) => sectionOfEntry(entry, today) === 'today').length,
      thisWeek: active.filter((entry) => sectionOfEntry(entry, today) === 'thisWeek').length,
    };
  }, [assigned, steps]);

  const rest = useMemo(() => {
    const missing = items.filter((item) => item.kind === 'missing_item' && item.run_id === null);
    return {
      notes: toListEntries(
        items.filter(
          (item) => item.kind === 'note' || (item.kind === 'tracker' && item.parent_id === null),
        ),
        [],
      ),
      shopping: shoppingCategories
        .map((category) => ({
          category,
          count: missing.filter((item) => item.shopping_category === category).length,
        }))
        .filter((group) => group.count > 0),
      shoppingCount: missing.length,
    };
  }, [items]);

  return {
    ...timed,
    ...rest,
    owedToUs: sum(debts.owedToUs),
    weOwe: sum(debts.weOwe),
    debtCount: debts.owedToUs.length + debts.weOwe.length,
  };
}
