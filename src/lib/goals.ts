import { currentSlot, upcomingSlots } from './recurrence';
import type { Item, ItemRepeat, OccurrenceCount } from '../types/domain';

/** The last day of a series with no end: later than any date. */
export const noEnd = '9999-12-31';

/** The date a goal's steps are to be done by, when it has one. */
export function goalTarget(goal: Item): string | null {
  return goal.kind === 'goal' && goal.time_mode === 'scheduled' ? goal.due_date : null;
}

function gone(count: OccurrenceCount | undefined): number {
  return count?.gone ?? 0;
}

/**
 * The last day an item is due: its date, or the last occurrence of its series (`noEnd` when it
 * repeats with no end). Null when it has no date.
 */
export function lastDay(
  item: Item,
  repeat: ItemRepeat | undefined,
  count: OccurrenceCount | undefined,
): string | null {
  if (item.time_mode !== 'recurring') {
    return item.time_mode === 'scheduled' ? item.due_date : null;
  }
  const current = currentSlot(item);
  if (repeat === undefined || current === null || repeat.stopped_on !== null) {
    return current?.day ?? null;
  }
  if (repeat.end_kind === 'never') {
    return noEnd;
  }
  if (repeat.end_kind === 'until' && repeat.end_until !== null) {
    return repeat.end_until > current.day ? repeat.end_until : current.day;
  }
  const slots = upcomingSlots(repeat, current, gone(count), repeat.end_count ?? 1);
  return slots.at(-1)?.day ?? current.day;
}

/** A step that repeats with no end, and so never holds back "all steps done". */
export function isOpenEnded(step: Item, repeat: ItemRepeat | undefined): boolean {
  return (
    step.status === 'open' &&
    step.time_mode === 'recurring' &&
    repeat !== undefined &&
    repeat.end_kind === 'never' &&
    repeat.stopped_on === null
  );
}

/** The open steps that end after a date: they keep a goal from moving earlier than it. */
export function stepsAfter(
  steps: readonly Item[],
  day: string,
  repeats: ReadonlyMap<string, ItemRepeat>,
  counts: ReadonlyMap<string, OccurrenceCount>,
  /** Steps with no end count as ending on the day, since they will be made to. */
  endingOnDay: boolean,
): Item[] {
  return steps.filter((step) => {
    if (step.status !== 'open' || step.hidden) {
      return false;
    }
    const repeat = repeats.get(step.id);
    if (endingOnDay && isOpenEnded(step, repeat)) {
      return (step.due_date ?? '') > day;
    }
    const last = lastDay(step, repeat, counts.get(step.id));
    return last !== null && last > day;
  });
}

/** A step dated after its goal's date, or whose series runs past it. */
export function isLateStep(
  step: Item,
  goal: Item,
  repeat: ItemRepeat | undefined,
  count: OccurrenceCount | undefined,
): boolean {
  const target = goalTarget(goal);
  if (target === null || step.status !== 'open') {
    return false;
  }
  const last = lastDay(step, repeat, count);
  return last !== null && last > target;
}

export type Progress = {
  readonly done: number;
  readonly total: number;
  /** Every step is done, leaving out those that repeat with no end; false with none such. */
  readonly allDone: boolean;
};

/**
 * How far a goal has come, counting occurrences: a repeating step counts each of its
 * occurrences, those ahead included; one with no end counts those so far and the current one.
 */
export function goalProgress(
  steps: readonly Item[],
  repeats: ReadonlyMap<string, ItemRepeat>,
  counts: ReadonlyMap<string, OccurrenceCount>,
): Progress {
  let done = 0;
  let total = 0;
  let finite = 0;
  let finiteDone = 0;
  for (const step of steps) {
    const repeat = repeats.get(step.id);
    const count = counts.get(step.id);
    const openEnded = isOpenEnded(step, repeat);
    const closed = step.status === 'done' && !step.closed_with_parent;
    if (!openEnded) {
      finite += 1;
      finiteDone += closed ? 1 : 0;
    }
    if (step.time_mode !== 'recurring' || repeat === undefined) {
      total += 1;
      done += closed ? 1 : 0;
      continue;
    }
    const doneOccurrences = count?.done ?? 0;
    const ahead =
      step.status !== 'open'
        ? 0
        : openEnded
          ? currentSlot(step) === null
            ? 0
            : 1
          : upcomingSlots(repeat, currentSlot(step), gone(count), 500).length;
    // A series closed before any occurrence counts once, as the item it is.
    const slots = Math.max(gone(count) + ahead, 1);
    total += slots;
    done += Math.min(slots, closed && gone(count) === 0 ? 1 : doneOccurrences);
  }
  return { done, total, allDone: finite > 0 && finiteDone === finite };
}
