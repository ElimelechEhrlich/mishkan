import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useInCalendar } from '../../hooks/useCalendarItems';

type CalendarBadgeProps = {
  readonly itemId: string;
};

/**
 * A small calendar page in Google Calendar's colors beside an item that is in the parent's
 * Google Calendar; nothing for one that is not.
 */
export function CalendarBadge({ itemId }: CalendarBadgeProps): ReactElement | null {
  const inCalendar = useInCalendar(itemId);
  if (!inCalendar) {
    return null;
  }
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={labels.calendar.badge}
      className="size-3.5 shrink-0"
    >
      <title>{labels.calendar.badge}</title>
      <rect x="1" y="1" width="14" height="14" rx="2.5" className="fill-surface" />
      <path
        d="M3.5 1h9A2.5 2.5 0 0 1 15 3.5V5H1V3.5A2.5 2.5 0 0 1 3.5 1z"
        className="fill-gcal-blue"
      />
      <path d="M1 11h3v4h-0.5A2.5 2.5 0 0 1 1 12.5z" className="fill-gcal-green" />
      <path d="M12 11h3v1.5a2.5 2.5 0 0 1-2.5 2.5H12z" className="fill-gcal-yellow" />
      <path d="M12 5h3v6h-3z" className="fill-gcal-red" opacity="0.9" />
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="2"
        fill="none"
        strokeWidth="1"
        className="stroke-gcal-blue"
      />
      <text
        x="6.5"
        y="12.6"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        className="fill-gcal-blue"
      >
        31
      </text>
    </svg>
  );
}
