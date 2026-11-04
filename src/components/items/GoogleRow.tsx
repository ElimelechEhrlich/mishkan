import { useContext } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useGoogleChoice } from '../../hooks/useGoogleCalendar';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { PropertyChipsContext } from '../ui/propertyLayout';
import { CalendarBadge } from './CalendarBadge';

type GoogleRowProps = {
  readonly item: Item;
  /** How many reminders the item has. */
  readonly reminders: number;
  /** The item has an hour: a reminder at it can be added by itself. */
  readonly hasHour: boolean;
  /** Adds a reminder at the item's hour. */
  readonly onAddAtHour: () => void;
  /** Opens the reminders, to choose when one rings. */
  readonly onOpenReminders: () => void;
};

/**
 * A switch on an item's page, once the household is connected to Google Calendar. An
 * appointment is there unless taken out; any other item puts its reminders there when
 * marked, so it needs at least one: one at its hour is added, or the reminders open.
 */
export function GoogleRow({
  item,
  reminders,
  hasHour,
  onAddAtHour,
  onOpenReminders,
}: GoogleRowProps): ReactElement {
  const google = useGoogleChoice(item.id);
  const asChip = useContext(PropertyChipsContext);
  const appointment = item.kind === 'appointment';
  const on = appointment ? google.choice !== false : google.choice === true;
  const label = appointment ? labels.google.appointmentRow : labels.google.remindersRow;
  const needsReminder = !appointment && !on && reminders === 0 && !hasHour;

  function toggle(): void {
    if (appointment) {
      google.set(on ? false : null);
      return;
    }
    if (on) {
      google.set(null);
      return;
    }
    if (reminders === 0) {
      if (!hasHour) {
        onOpenReminders();
        return;
      }
      onAddAtHour();
    }
    google.set(true);
  }

  const note =
    google.error !== null
      ? `${labels.google.failedChoice} (${google.error})`
      : needsReminder
        ? labels.google.needReminder
        : !on
          ? ''
          : appointment
            ? labels.google.appointmentOn
            : reminders === 0
              ? labels.google.noReminders
              : labels.google.remindersOn;

  if (asChip) {
    return (
      <>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={google.busy}
          onClick={toggle}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition active:scale-[0.97] ${
            on ? 'bg-primary-soft text-primary' : 'bg-surface text-muted shadow-card'
          }`}
        >
          <Icon name={on ? 'check' : 'calendar'} className="size-3.5 shrink-0" />
          {label}
        </button>
        {google.error !== null && (
          <p className="order-last basis-full text-[13px] text-alert">{note}</p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={google.busy}
        onClick={toggle}
        className="flex min-h-12 w-full items-center gap-3 py-2 text-start"
      >
        <span className="flex shrink-0 items-center gap-1.5 text-[15px]">
          {label}
          <CalendarBadge itemId={item.id} />
        </span>
        <span className="min-w-0 flex-1 truncate text-end text-[13px] text-muted">
          {google.error === null ? note : ''}
        </span>
        <span
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            on ? 'bg-primary' : 'bg-line'
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-all ${
              on ? 'start-[1.125rem]' : 'start-0.5'
            }`}
          />
        </span>
      </button>
      {google.error !== null && <p className="-mt-1 pb-3 text-[13px] text-alert">{note}</p>}
    </div>
  );
}
