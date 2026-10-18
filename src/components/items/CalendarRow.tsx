import { useContext } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useCalendarToggle } from '../../hooks/useCalendarItems';
import { Icon } from '../ui/Icon';
import { PropertyChipsContext } from '../ui/propertyLayout';
import { CalendarBadge } from './CalendarBadge';

type CalendarRowProps = {
  readonly itemId: string;
};

/**
 * A switch on an item's page: whether it shows in the parent's Google Calendar. Among
 * property chips it is a chip that is marked while on.
 */
export function CalendarRow({ itemId }: CalendarRowProps): ReactElement {
  const calendar = useCalendarToggle(itemId);
  const asChip = useContext(PropertyChipsContext);

  if (asChip) {
    return (
      <>
        <button
          type="button"
          role="switch"
          aria-checked={calendar.on}
          disabled={calendar.busy}
          onClick={() => {
            calendar.set(!calendar.on);
          }}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition active:scale-[0.97] ${
            calendar.on ? 'bg-primary-soft text-primary' : 'bg-surface text-muted shadow-card'
          }`}
        >
          <Icon name={calendar.on ? 'check' : 'calendar'} className="size-3.5 shrink-0" />
          {labels.calendar.row}
        </button>
        {calendar.error !== null && (
          <p className="order-last basis-full text-[13px] text-alert">
            {labels.calendar.failed} ({calendar.error})
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        role="switch"
        aria-checked={calendar.on}
        disabled={calendar.busy}
        onClick={() => {
          calendar.set(!calendar.on);
        }}
        className="flex min-h-12 w-full items-center gap-3 py-2 text-start"
      >
        <span className="flex shrink-0 items-center gap-1.5 text-[15px]">
          {labels.calendar.row}
          <CalendarBadge itemId={itemId} />
        </span>
        <span className="min-w-0 flex-1 truncate text-end text-[13px] text-muted">
          {calendar.on ? labels.calendar.syncing : ''}
        </span>
        <span
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            calendar.on ? 'bg-primary' : 'bg-line'
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-all ${
              calendar.on ? 'start-[1.125rem]' : 'start-0.5'
            }`}
          />
        </span>
      </button>
      {calendar.error !== null && (
        <p className="-mt-1 pb-3 text-[13px] text-alert">
          {labels.calendar.failed} ({calendar.error})
        </p>
      )}
    </div>
  );
}
