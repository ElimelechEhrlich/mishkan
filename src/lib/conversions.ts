import { labels } from '../constants/labels';
import { formatPickedDate } from './itemRules';
import { repeatTimes } from './recurrence';
import type { ConvertibleKind, Item, ItemReminder, ItemRepeat } from '../types/domain';

/** The kinds an item can become: an appointment only a task, and back. */
export function conversionTargets(kind: ConvertibleKind): ConvertibleKind[] {
  if (kind === 'appointment') {
    return ['task'];
  }
  const all: ConvertibleKind[] = [
    'task',
    'goal',
    'issue',
    'note',
    'tracker',
    'debt',
    'missing_item',
    ...(kind === 'task' ? (['appointment'] as const) : []),
  ];
  return all.filter((target) => target !== kind);
}

/** Kinds that hold a time of their own; trackers and missing items only while repeating. */
function keepsTime(kind: ConvertibleKind, repeating: boolean): boolean {
  return (
    kind === 'task' ||
    kind === 'goal' ||
    kind === 'appointment' ||
    (repeating && (kind === 'tracker' || kind === 'missing_item'))
  );
}

/** Whether a task becoming an appointment still needs its day and hour. */
export function needsAppointmentTime(item: Item, target: ConvertibleKind): boolean {
  return target === 'appointment' && (item.due_date === null || item.due_time === null);
}

/** What converting will change, in a few short lines, to read before confirming. */
export function conversionChanges(
  item: Item,
  target: ConvertibleKind,
  repeat: ItemRepeat | null,
  reminders: readonly ItemReminder[],
): string[] {
  const repeating = item.time_mode === 'recurring' && repeat !== null;
  const hasTime = repeating || item.due_date !== null || item.starts_at !== null;
  const changes: string[] = [];
  if (target === 'goal' && repeating) {
    changes.push(
      item.due_date === null
        ? labels.convert.changes.repeatHidden
        : labels.convert.changes.targetFrom(formatPickedDate(item.due_date)),
    );
  } else if (hasTime && !keepsTime(target, repeating)) {
    changes.push(labels.convert.changes.timeHidden);
    if (reminders.some((reminder) => reminder.rule === 'before' || reminder.rule === 'day')) {
      changes.push(labels.convert.changes.remindersHidden);
    }
  } else if (repeating) {
    changes.push(labels.convert.changes.repeatKept);
  }
  if (target === 'appointment' && repeat !== null && repeating && repeatTimes(repeat).length > 1) {
    changes.push(labels.convert.changes.oneHour);
  }
  if (item.kind === 'appointment' && (item.place ?? item.meeting_url ?? item.with_whom) !== null) {
    changes.push(labels.convert.changes.placeHidden);
  }
  return changes;
}
