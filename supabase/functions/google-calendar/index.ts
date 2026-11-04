// Supabase Edge Function: the household's Google Calendar, connected directly. One parent
// connects the household's Google account once; this function then keeps a calendar of its
// own there, "משכן", and sends it what changes in the app:
// - every appointment (unless taken out), with its reminders as the event's notifications;
// - for any other item marked "תזכורות ביומן גוגל", a small event at each of its reminders.
// Nothing in a personal entity goes there. The database queues what changed (0050), and a
// cron job calls this function every minute with { action: 'cron' } to send the queue.
// The app calls it too: 'start' (the address of Google's consent page), 'connect' (with the
// code Google returns to the app; it connects at once, and the next minute sends the events),
// 'disconnect', and 'sync' (send this household's queue now).
// Secrets: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (set by the owner). SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.50.0';

const appUrl = 'https://mishkan.vercel.app';
/** Where Google returns after consent: a page of the app, which hands the code here. */
const redirectUri = `${appUrl}/google-calendar`;
/** Only calendars this app makes, and their events: never the account's other calendars. */
const scope = 'https://www.googleapis.com/auth/calendar.app.created';
const zone = 'Asia/Jerusalem';
const api = 'https://www.googleapis.com/calendar/v3';
/** How far ahead the reminders of a repeating item are laid out, one event each. */
const aheadDays = 60;
/** How far ahead the times of a series with an end are given (about ten years). */
const listedDays = 3660;
/** Google keeps at most 5 notifications on an event, at most 4 weeks before it. */
const maxNotifications = 5;
const maxMinutesBefore = 40320;
/** How long one call keeps sending, so it ends well within its time (and its turn). */
const sendingMs = 40000;
/** The most queued items one call looks at. */
const batchSize = 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------------------
// Time, as the app keeps it: days and hours in Israel. Local times are counted as minutes on
// a plain clock (no zone), and Google is told the zone.

/** A local moment as minutes since 1970 on a plain clock. */
function minutesOf(day: string, time: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0) / 60000;
}

/** Minutes on a plain clock back to a day and an hour. */
function fromMinutes(total: number): { day: string; time: string } {
  const iso = new Date(total * 60000).toISOString();
  return { day: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function addDays(day: string, days: number): string {
  return fromMinutes(minutesOf(day, '00:00') + days * 1440).day;
}

/** A moment (as the database gives it) as the day and hour it is in Israel. */
function localOf(moment: string): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(moment));
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

function todayInIsrael(): string {
  return localOf(new Date().toISOString()).day;
}

/** "HH:MM:SS" or "HH:MM" as "HH:MM". */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** 2026-11-04 as 20261104, and with an hour as 20261104T160000. */
function compact(day: string, time: string | null = null): string {
  const date = day.replace(/-/g, '');
  return time === null ? date : `${date}T${hhmm(time).replace(':', '')}00`;
}

// ---------------------------------------------------------------------------------------
// What the database holds, as read here.

type Item = {
  id: string;
  household_id: string;
  title: string;
  kind: string;
  status: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null;
  starts_at: string | null;
  place: string | null;
  meeting_url: string | null;
  with_whom: string | null;
  completed_at: string | null;
};

type Repeat = {
  every: number;
  unit: 'day' | 'week' | 'month' | 'year';
  starts_on: string;
  at_time: string | null;
  times: string[];
  weekdays: number[];
  end_kind: 'never' | 'count' | 'until';
  end_count: number | null;
  end_until: string | null;
  stopped_on: string | null;
  from_kind: 'schedule' | 'completion';
  planned_date: string | null;
  planned_time: string | null;
  dates: string[];
};

type Reminder = {
  id: string;
  item_id: string;
  member_ids: string[] | null;
  rule: 'at' | 'before' | 'day' | 'repeat';
  at: string | null;
  minutes_before: number | null;
  days_before: number | null;
  at_time: string | null;
  every: number | null;
  unit: 'day' | 'week' | 'month' | 'year' | null;
  until: string | null;
  due_at: string | null;
};

type Occurrence = { on_date: string; at_time: string | null; status: string };

type Slot = { on_date: string; at_time: string | null };

/** Everything the events of one item are made from. */
type ItemFacts = {
  item: Item;
  personal: boolean;
  /** true: put in; false: taken out; null: as its kind says. */
  included: boolean | null;
  repeat: Repeat | null;
  reminders: Reminder[];
  occurrences: Occurrence[];
  /** The open times ahead, for the reminders of a repeating item. */
  slots: Slot[];
  today: string;
};

type EventBody = Record<string, unknown>;

/** An event to keep in the calendar, under a key of its own within the item. */
type Planned = {
  key: string;
  body: EventBody;
  /** When Google refuses a series given by its days, the same days one event each. */
  fallback?: Planned[];
};

// ---------------------------------------------------------------------------------------
// The plan: which events an item should have. Pure, so it can be checked on its own.

function isAppointment(facts: ItemFacts): boolean {
  return facts.item.kind === 'appointment';
}

/** The hour of the item's current time: an appointment's from when it starts. */
function itemHour(item: Item): string | null {
  if (item.kind === 'appointment' && item.starts_at !== null) {
    return localOf(item.starts_at).time;
  }
  return item.due_time === null ? null : hhmm(item.due_time);
}

/** The hours of each day of a series, earliest first; none for the whole day. */
function repeatHours(repeat: Repeat): string[] {
  const hours =
    repeat.times.length > 0 ? repeat.times : repeat.at_time === null ? [] : [repeat.at_time];
  return [...new Set(hours.map(hhmm))].sort();
}

function description(item: Item): string {
  const lines = [
    item.with_whom === null || item.with_whom.trim() === '' ? null : `עם: ${item.with_whom.trim()}`,
    item.notes === null || item.notes.trim() === '' ? null : item.notes.trim(),
    `לשינוי, במשכן: ${appUrl}/item/${item.id}`,
  ];
  return lines.filter((line) => line !== null).join('\n');
}

/** Start and end of an event on a day, at an hour (an hour long) or the whole day. */
function when(day: string, time: string | null): EventBody {
  if (time === null) {
    return { start: { date: day }, end: { date: addDays(day, 1) }, transparency: 'transparent' };
  }
  const end = fromMinutes(minutesOf(day, time) + 60);
  return {
    start: { dateTime: `${day}T${time}:00`, timeZone: zone },
    end: { dateTime: `${end.day}T${end.time}:00`, timeZone: zone },
    transparency: 'opaque',
  };
}

/**
 * An appointment's reminders as minutes before an event on a day and hour (the whole day:
 * from midnight). Only what Google can ring: before the start, up to 4 weeks, 5 at most
 * (the nearest to the event). A fixed time only on an appointment that does not repeat.
 */
function notificationsFor(
  reminders: readonly Reminder[],
  day: string,
  time: string | null,
  repeating: boolean,
): { method: string; minutes: number }[] {
  const start = minutesOf(day, time ?? '00:00');
  const minutes = reminders.flatMap((reminder): number[] => {
    if (reminder.rule === 'before' && reminder.minutes_before !== null && time !== null) {
      return [reminder.minutes_before];
    }
    if (reminder.rule === 'day' && reminder.at_time !== null) {
      const rings = minutesOf(addDays(day, -(reminder.days_before ?? 0)), hhmm(reminder.at_time));
      return [start - rings];
    }
    if (reminder.rule === 'at' && reminder.at !== null && !repeating) {
      const at = localOf(reminder.at);
      return [start - minutesOf(at.day, at.time)];
    }
    return [];
  });
  return [...new Set(minutes.filter((m) => m >= 0 && m <= maxMinutesBefore))]
    .sort((a, b) => a - b)
    .slice(0, maxNotifications)
    .map((m) => ({ method: 'popup', minutes: m }));
}

const weekdayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** The first day of a series that is one of its days (a weekly one may start between them). */
function firstDay(repeat: Repeat): string {
  if (repeat.unit !== 'week' || repeat.weekdays.length === 0) {
    return repeat.starts_on;
  }
  let day = repeat.starts_on;
  for (let i = 0; i < 7 && !repeat.weekdays.includes(weekdayOf(day)); i += 1) {
    day = addDays(day, 1);
  }
  return day;
}

/** The last day of a series, if it has one: its end, when it was stopped, or when closed. */
function lastDay(item: Item, repeat: Repeat): string | null {
  const ends = [
    repeat.end_kind === 'until' ? repeat.end_until : null,
    repeat.stopped_on,
    item.status === 'done' && item.completed_at !== null ? localOf(item.completed_at).day : null,
  ].filter((day): day is string => day !== null);
  return ends.length === 0 ? null : (ends.sort()[0] ?? null);
}

/** Days of a series given in place of those its start implies (for a shifted reminder). */
type Shape = { byday?: number; bymonth?: number; bymonthday?: number };

/**
 * A series as Google's rule. The days of the month past the 28th fall, as in the app, on the
 * month's last day when it is shorter; so does February 29 in a common year. A shape gives
 * other days in their place: a negative day of the month counts from its end.
 */
function rule(
  repeat: Repeat,
  count: number | null,
  until: string | null,
  timed: boolean,
  shape: Shape | null = null,
): string {
  const freq = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }[repeat.unit];
  const parts = [`FREQ=${freq}`, `INTERVAL=${String(repeat.every)}`, 'WKST=SU'];
  const startDay = Number(repeat.starts_on.slice(8, 10));
  const startMonth = Number(repeat.starts_on.slice(5, 7));
  if (shape !== null) {
    if (shape.byday !== undefined) {
      parts.push(`BYDAY=${weekdayCodes[shape.byday] ?? 'SU'}`);
    }
    if (shape.bymonth !== undefined) {
      parts.push(`BYMONTH=${String(shape.bymonth)}`);
    }
    if (shape.bymonthday !== undefined) {
      parts.push(`BYMONTHDAY=${String(shape.bymonthday)}`);
    }
  } else {
    if (repeat.unit === 'week' && repeat.weekdays.length > 0) {
      parts.push(
        `BYDAY=${[...repeat.weekdays]
          .sort()
          .map((d) => weekdayCodes[d])
          .join(',')}`,
      );
    }
    if (repeat.unit === 'month' && startDay > 28) {
      const days = Array.from({ length: startDay - 27 }, (_, i) => String(28 + i));
      parts.push(`BYMONTHDAY=${days.join(',')}`, 'BYSETPOS=-1');
    }
    if (repeat.unit === 'year' && startMonth === 2 && startDay === 29) {
      parts.push('BYMONTH=2', 'BYMONTHDAY=28,29', 'BYSETPOS=-1');
    }
  }
  if (count !== null) {
    parts.push(`COUNT=${String(Math.max(1, count))}`);
  } else if (until !== null) {
    // The end of the last day in Israel, as Google wants it (in UTC for a timed series).
    parts.push(`UNTIL=${timed ? `${compact(until)}T205959Z` : compact(until)}`);
  }
  return `RRULE:${parts.join(';')}`;
}

function dateList(prefix: string, days: readonly string[], time: string | null): string {
  const values = days.map((day) => compact(day, time)).join(',');
  return time === null ? `${prefix};VALUE=DATE:${values}` : `${prefix};TZID=${zone}:${values}`;
}

/** The event of an appointment on one day and hour. */
function appointmentEvent(
  facts: ItemFacts,
  key: string,
  day: string,
  time: string | null,
  repeating: boolean,
): Planned {
  const { item } = facts;
  const place = [item.place, item.meeting_url].find((p) => p !== null && p.trim() !== '');
  return {
    key,
    body: {
      summary: item.title,
      description: description(item),
      ...(place === undefined || place === null ? {} : { location: place.trim() }),
      ...when(day, time),
      reminders: {
        useDefault: false,
        overrides: notificationsFor(facts.reminders, day, time, repeating),
      },
    },
  };
}

/** The events of an appointment: once, or a series for each hour of its days. */
function appointmentEvents(facts: ItemFacts): Planned[] {
  const { item, repeat } = facts;
  if (repeat === null || repeat.from_kind === 'completion') {
    if (item.due_date === null) {
      return [];
    }
    return [appointmentEvent(facts, 'main', item.due_date, itemHour(item), false)];
  }
  const hours = repeatHours(repeat);
  const slots: (string | null)[] = hours.length > 0 ? hours : [itemHour(item)];
  const skipped = facts.occurrences.filter((o) => o.status === 'skipped');
  // The current one, moved from where it was planned, is an event of its own.
  const moved = repeat.planned_date !== null && hours.length <= 1 && item.due_date !== null;
  const until = lastDay(item, repeat);
  const events: Planned[] = [];
  slots.forEach((time, index) => {
    const exceptions = [
      ...skipped
        .filter((o) => (o.at_time === null ? null : hhmm(o.at_time)) === time)
        .map((o) => o.on_date),
      ...(moved && repeat.planned_date !== null ? [repeat.planned_date] : []),
    ];
    const exdate = exceptions.length === 0 ? [] : [dateList('EXDATE', exceptions, time)];
    const key = `series:${time ?? 'day'}`;
    if (repeat.dates.length > 0) {
      // A Hebrew date (or days given in full): the days themselves.
      const days = repeat.dates
        .filter((day) => day >= repeat.starts_on && (until === null || day <= until))
        .sort();
      const [first, ...rest] = days;
      if (first === undefined) {
        return;
      }
      const base = appointmentEvent(facts, key, first, time, true);
      events.push({
        key,
        body: {
          ...base.body,
          recurrence: [...(rest.length === 0 ? [] : [dateList('RDATE', rest, time)]), ...exdate],
        },
        fallback: days
          .filter((day) => !exceptions.includes(day))
          .map((day) => appointmentEvent(facts, `day:${day}:${time ?? 'day'}`, day, time, true)),
      });
      return;
    }
    // Of a number of times, those at this hour: the slots of each day are counted in order.
    const count =
      repeat.end_kind === 'count' && repeat.end_count !== null
        ? Math.floor((repeat.end_count - index - 1) / slots.length) + 1
        : null;
    if (count !== null && count < 1) {
      return;
    }
    const base = appointmentEvent(facts, key, firstDay(repeat), time, true);
    events.push({
      key,
      body: { ...base.body, recurrence: [rule(repeat, count, until, time !== null), ...exdate] },
    });
  });
  if (moved && item.due_date !== null && item.status === 'open') {
    events.push(appointmentEvent(facts, 'moved', item.due_date, itemHour(item), true));
  }
  return events;
}

/** A small event at the moment a reminder rings: "🔔" and the item, ringing at its start. */
function markerEvent(
  facts: ItemFacts,
  key: string,
  at: number,
  recurrence: readonly string[] = [],
): Planned {
  const moment = fromMinutes(at);
  const dateTime = { dateTime: `${moment.day}T${moment.time}:00`, timeZone: zone };
  return {
    key,
    body: {
      summary: `🔔 ${facts.item.title}`,
      description: description(facts.item),
      start: dateTime,
      end: dateTime,
      transparency: 'transparent',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      ...(recurrence.length === 0 ? {} : { recurrence: [...recurrence] }),
    },
  };
}

/** When a reminder rings for one time of the item, on a plain clock; null when it cannot. */
function ringsAt(reminder: Reminder, day: string, time: string | null): number | null {
  if (reminder.rule === 'before' && reminder.minutes_before !== null && time !== null) {
    return minutesOf(day, time) - reminder.minutes_before;
  }
  if (reminder.rule === 'day' && reminder.at_time !== null) {
    return minutesOf(addDays(day, -(reminder.days_before ?? 0)), hhmm(reminder.at_time));
  }
  return null;
}

/** The reminders of an item that is not an event, each as small events of its own. */
function markerEvents(facts: ItemFacts): Planned[] {
  const { item, repeat } = facts;
  if (item.status !== 'open') {
    return [];
  }
  // Nothing from before today: what already rang is not needed in the calendar.
  const earliest = minutesOf(facts.today, '00:00');
  const repeating = repeat !== null && repeat.from_kind === 'schedule';
  return facts.reminders.flatMap((reminder): Planned[] => {
    const key = `r:${reminder.id}`;
    if (reminder.rule === 'at') {
      if (reminder.at === null) {
        return [];
      }
      const at = localOf(reminder.at);
      const minutes = minutesOf(at.day, at.time);
      return minutes < earliest ? [] : [markerEvent(facts, key, minutes)];
    }
    if (reminder.rule === 'repeat') {
      if (reminder.due_at === null || reminder.unit === null) {
        return [];
      }
      const next = localOf(reminder.due_at);
      const freq = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }[
        reminder.unit
      ];
      const until = reminder.until === null ? '' : `;UNTIL=${compact(reminder.until)}T205959Z`;
      return [
        markerEvent(facts, key, minutesOf(next.day, next.time), [
          `RRULE:FREQ=${freq};INTERVAL=${String(reminder.every ?? 1)}${until}`,
        ]),
      ];
    }
    if (!repeating) {
      if (item.due_date === null) {
        return [];
      }
      const minutes = ringsAt(reminder, item.due_date, itemHour(item));
      return minutes === null || minutes < earliest ? [] : [markerEvent(facts, key, minutes)];
    }
    return seriesMarkers(facts, reminder, key);
  });
}

/** A list of moments, as Google takes them in RDATE or EXDATE. */
function momentList(prefix: string, moments: readonly number[]): string {
  const values = moments.map((m) => {
    const at = fromMinutes(m);
    return compact(at.day, at.time);
  });
  return `${prefix};TZID=${zone}:${values.join(',')}`;
}

/** The most days given one by one in a single series. */
const maxListed = 1000;

/**
 * A reminder of a repeating item as a series of its own, ringing for every time of the item
 * as the item repeats: the same rule moved to the reminder's hour, and to an earlier day when
 * it rings days before (a weekday earlier, a day of the month earlier, counted from the end
 * of the month before when it falls there). A series with an end, or given by its days (a
 * Hebrew date), is given by its moments. Only a month's 29th to 31st rung days before has no
 * such rule: its times ahead are laid out one by one.
 */
function seriesMarkers(facts: ItemFacts, reminder: Reminder, key: string): Planned[] {
  const { item } = facts;
  const repeat = facts.repeat;
  if (repeat === null) {
    return [];
  }
  const earliest = minutesOf(facts.today, '00:00');
  const hours = repeatHours(repeat);
  const slotHours: (string | null)[] = hours.length > 0 ? hours : [itemHour(item)];
  const finite =
    repeat.dates.length > 0 ||
    repeat.end_kind !== 'never' ||
    repeat.stopped_on !== null ||
    item.status !== 'open';

  // Ended, or given by its days: every moment ahead, from the item's own times.
  if (finite) {
    const moments = facts.slots
      .map((slot) =>
        ringsAt(reminder, slot.on_date, slot.at_time === null ? null : hhmm(slot.at_time)),
      )
      .filter((m): m is number => m !== null && m >= earliest)
      .sort((a, b) => a - b)
      .slice(0, maxListed);
    const [first, ...rest] = moments;
    return first === undefined
      ? []
      : [markerEvent(facts, key, first, rest.length === 0 ? [] : [momentList('RDATE', rest)])];
  }

  const skipped = facts.occurrences.filter((o) => o.status === 'skipped');
  const moved = repeat.planned_date !== null && hours.length <= 1 && item.due_date !== null;
  const events: Planned[] = [];
  for (const time of slotHours) {
    const first = firstDay(repeat);
    const rings = ringsAt(reminder, first, time);
    if (rings === null) {
      continue;
    }
    // How much earlier it rings than its time, the same for every time of this hour.
    const before = minutesOf(first, time ?? '00:00') - rings;
    const shift = (day: string): number => minutesOf(day, time ?? '00:00') - before;
    const daysBefore = Math.round(
      (minutesOf(first, '00:00') - minutesOf(fromMinutes(rings).day, '00:00')) / 1440,
    );
    const exceptions = [
      ...skipped
        .filter((o) => (o.at_time === null ? null : hhmm(o.at_time)) === time)
        .map((o) => shift(o.on_date)),
      ...(moved && repeat.planned_date !== null ? [shift(repeat.planned_date)] : []),
    ];
    const exdate = exceptions.length === 0 ? [] : [momentList('EXDATE', exceptions)];
    const hourKey = `${key}:${time ?? 'day'}`;
    const series = (subKey: string, start: string, shape: Shape | null): void => {
      events.push(
        markerEvent(facts, subKey, shift(start), [
          rule(repeat, null, null, true, shape),
          ...exdate,
        ]),
      );
    };
    const startDay = Number(repeat.starts_on.slice(8, 10));
    const startMonth = Number(repeat.starts_on.slice(5, 7));
    if (daysBefore === 0 || repeat.unit === 'day') {
      series(hourKey, first, null);
      continue;
    }
    if (repeat.unit === 'week') {
      // Each day of the week on its own, a day (or more) earlier.
      const weekdays = repeat.weekdays.length > 0 ? repeat.weekdays : [weekdayOf(first)];
      for (const weekday of weekdays) {
        let day = first;
        while (weekdayOf(day) !== weekday) {
          day = addDays(day, 1);
        }
        series(`${hourKey}:${String(weekday)}`, day, {
          byday: (((weekday - daysBefore) % 7) + 7) % 7,
        });
      }
      continue;
    }
    const day = startDay - daysBefore;
    const clamped = startDay > 28 || (startMonth === 2 && startDay === 29);
    // Within the month before, counted from its end; further than that, no rule says it.
    const fromEnd = day - 1;
    if (clamped || fromEnd < -28) {
      events.push(...laidOut(facts, reminder, `${hourKey}:ahead`));
      continue;
    }
    const monthBefore = startMonth === 1 ? 12 : startMonth - 1;
    series(hourKey, first, {
      ...(repeat.unit === 'year' ? { bymonth: day >= 1 ? startMonth : monthBefore } : {}),
      bymonthday: day >= 1 ? day : fromEnd,
    });
  }
  if (moved && item.due_date !== null) {
    const rings = ringsAt(reminder, item.due_date, itemHour(item));
    if (rings !== null && rings >= earliest) {
      events.push(markerEvent(facts, `${key}:moved`, rings));
    }
  }
  return events;
}

/** A reminder's times ahead, one event each (for what no rule of Google's can say). */
function laidOut(facts: ItemFacts, reminder: Reminder, key: string): Planned[] {
  const earliest = minutesOf(facts.today, '00:00');
  const until = minutesOf(addDays(facts.today, aheadDays), '00:00');
  return facts.slots.flatMap((slot): Planned[] => {
    const time = slot.at_time === null ? null : hhmm(slot.at_time);
    const minutes = ringsAt(reminder, slot.on_date, time);
    return minutes === null || minutes < earliest || minutes > until
      ? []
      : [markerEvent(facts, `${key}:${slot.on_date}:${time ?? 'day'}`, minutes)];
  });
}

/** Every event an item should have in the calendar; none when it should have none. */
function planItem(facts: ItemFacts): Planned[] {
  if (facts.personal) {
    return [];
  }
  const planned = isAppointment(facts)
    ? facts.included === false
      ? []
      : appointmentEvents(facts)
    : facts.included === true
      ? markerEvents(facts)
      : [];
  // Marked as Mishkan's, so a later look can tell its events (and their keys) apart.
  return planned.map((event) => withMark(facts.item.id, event));
}

function withMark(itemId: string, event: Planned): Planned {
  return {
    ...event,
    body: {
      ...event.body,
      extendedProperties: { private: { mishkanItem: itemId, mishkanKey: event.key } },
    },
    ...(event.fallback === undefined
      ? {}
      : { fallback: event.fallback.map((one) => withMark(itemId, one)) }),
  };
}

// ---------------------------------------------------------------------------------------
// Google: the account's token, and calls to the calendar.

type Link = {
  household_id: string;
  refresh_token: string;
  access_token: string | null;
  access_expires_at: string | null;
  calendar_id: string | null;
  laid_out_on: string | null;
  sync_token: string | null;
  connected_by: string | null;
};

const linkColumns =
  'household_id, refresh_token, access_token, access_expires_at, calendar_id, laid_out_on, sync_token, connected_by';

class GoogleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The connection was taken back in Google, or its token no longer works. */
class LinkRevoked extends Error {}

async function tokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      ...params,
    }),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    if (body.error === 'invalid_grant') {
      throw new LinkRevoked(String(body.error_description ?? body.error));
    }
    throw new GoogleError(response.status, String(body.error_description ?? body.error));
  }
  return body;
}

/** A working access token, refreshed (and kept) when it is about to end. */
async function accessToken(db: SupabaseClient, link: Link): Promise<string> {
  if (
    link.access_token !== null &&
    link.access_expires_at !== null &&
    new Date(link.access_expires_at).getTime() > Date.now() + 60000
  ) {
    return link.access_token;
  }
  const body = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: link.refresh_token,
  });
  const token = String(body.access_token);
  const expires = new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000).toISOString();
  link.access_token = token;
  link.access_expires_at = expires;
  await db
    .from('google_links')
    .update({ access_token: token, access_expires_at: expires })
    .eq('household_id', link.household_id);
  return token;
}

async function google(
  db: SupabaseClient,
  link: Link,
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown> | null> {
  const token = await accessToken(db, link);
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  const parsed = text === '' ? {} : (JSON.parse(text) as Record<string, unknown>);
  if (!response.ok) {
    const error = parsed.error as { message?: string } | undefined;
    throw new GoogleError(response.status, error?.message ?? text);
  }
  return parsed;
}

function eventsPath(link: Link, eventId?: string): string {
  const calendar = encodeURIComponent(link.calendar_id ?? '');
  return `/calendars/${calendar}/events${eventId === undefined ? '' : `/${encodeURIComponent(eventId)}`}`;
}

async function fingerprint(body: EventBody): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------------------
// Sending: each queued item's events made to match its plan.

async function factsOf(
  db: SupabaseClient,
  itemId: string,
  today: string,
): Promise<ItemFacts | null> {
  const { data: item } = await db
    .from('items')
    .select(
      'id, household_id, title, kind, status, notes, due_date, due_time, starts_at, place, meeting_url, with_whom, completed_at',
    )
    .eq('id', itemId)
    .maybeSingle();
  if (item === null) {
    return null;
  }
  const [personal, choice, repeat, reminders, occurrences] = await Promise.all([
    db.rpc('item_is_personal', { p_item_id: itemId }),
    db.from('google_choices').select('included').eq('item_id', itemId).maybeSingle(),
    db.from('item_repeats').select('*').eq('item_id', itemId).maybeSingle(),
    db.from('item_reminders').select('*').eq('item_id', itemId),
    db.from('occurrences').select('on_date, at_time, status').eq('item_id', itemId),
  ]);
  const facts: ItemFacts = {
    item: item as Item,
    personal: personal.data === true,
    included: choice.data === null ? null : (choice.data as { included: boolean }).included,
    repeat: (repeat.data ?? null) as Repeat | null,
    reminders: (reminders.data ?? []) as Reminder[],
    occurrences: (occurrences.data ?? []) as Occurrence[],
    slots: [],
    today,
  };
  // The times ahead are needed only for the reminders of a repeating item.
  if (
    facts.item.kind !== 'appointment' &&
    facts.included === true &&
    facts.repeat !== null &&
    facts.repeat.from_kind === 'schedule'
  ) {
    // A series with an end is given by all its times; one without, by a rule (or the days
    // ahead, for what no rule says).
    const ended =
      facts.repeat.dates.length > 0 ||
      facts.repeat.end_kind !== 'never' ||
      facts.repeat.stopped_on !== null;
    const { data: slots } = await db.rpc('google_item_slots', {
      p_item_id: itemId,
      p_from: today,
      p_to: addDays(today, ended ? listedDays : aheadDays),
    });
    facts.slots = (slots ?? []) as Slot[];
  }
  return facts;
}

type KeptEvent = { key: string; event_id: string; fingerprint: string; dismissed: boolean };

async function sendEvent(
  db: SupabaseClient,
  link: Link,
  itemId: string,
  event: Planned,
  kept: KeptEvent | undefined,
): Promise<void> {
  const print = await fingerprint(event.body);
  // The same as sent, or removed in Google by a parent (and so kept out).
  if (kept !== undefined && (kept.fingerprint === print || kept.dismissed)) {
    return;
  }
  let sent: Record<string, unknown> | null = null;
  if (kept !== undefined) {
    try {
      sent = await google(db, link, 'PUT', eventsPath(link, kept.event_id), event.body);
    } catch (caught) {
      // Removed in Google meanwhile: it is made again.
      if (!(caught instanceof GoogleError && (caught.status === 404 || caught.status === 410))) {
        throw caught;
      }
    }
  }
  sent ??= await google(db, link, 'POST', eventsPath(link), event.body);
  await db.from('google_events').upsert({
    item_id: itemId,
    key: event.key,
    household_id: link.household_id,
    event_id: String(sent?.id ?? ''),
    fingerprint: print,
    sent: event.body,
    etag: typeof sent?.etag === 'string' ? sent.etag : null,
    dismissed: false,
    updated_at: new Date().toISOString(),
  });
}

async function removeEvent(db: SupabaseClient, link: Link, itemId: string, kept: KeptEvent) {
  try {
    await google(db, link, 'DELETE', eventsPath(link, kept.event_id));
  } catch (caught) {
    if (!(caught instanceof GoogleError && (caught.status === 404 || caught.status === 410))) {
      throw caught;
    }
  }
  await db.from('google_events').delete().eq('item_id', itemId).eq('key', kept.key);
}

/** Makes the calendar match one item. */
async function syncItem(db: SupabaseClient, link: Link, itemId: string, today: string) {
  const facts = await factsOf(db, itemId, today);
  const planned =
    facts === null || facts.item.household_id !== link.household_id ? [] : planItem(facts);
  const { data } = await db
    .from('google_events')
    .select('key, event_id, fingerprint, dismissed')
    .eq('item_id', itemId);
  const kept = new Map(((data ?? []) as KeptEvent[]).map((row) => [row.key, row]));
  const wanted = new Set<string>();
  for (const event of planned) {
    try {
      await sendEvent(db, link, itemId, event, kept.get(event.key));
      wanted.add(event.key);
    } catch (caught) {
      // A series by its days that Google will not take: its days one by one.
      if (
        !(caught instanceof GoogleError && caught.status === 400) ||
        event.fallback === undefined
      ) {
        throw caught;
      }
      for (const one of event.fallback) {
        await sendEvent(db, link, itemId, one, kept.get(one.key));
        wanted.add(one.key);
      }
    }
  }
  for (const [key, row] of kept) {
    if (!wanted.has(key)) {
      await removeEvent(db, link, itemId, row);
    }
  }
}

/** Sends a household's queue (a batch of it); what fails stays queued for the next call. */
async function syncHousehold(db: SupabaseClient, link: Link): Promise<void> {
  if (link.calendar_id === null) {
    return;
  }
  const today = todayInIsrael();
  // Once a day, the reminders of repeating items are laid out again, a day further.
  if (link.laid_out_on !== today) {
    const { data: picked } = await db
      .from('google_choices')
      .select('item_id')
      .eq('household_id', link.household_id)
      .eq('included', true);
    const rows = ((picked ?? []) as { item_id: string }[]).map((row) => ({
      item_id: row.item_id,
      household_id: link.household_id,
    }));
    if (rows.length > 0) {
      await db.from('google_queue').upsert(rows);
    }
    await db
      .from('google_links')
      .update({ laid_out_on: today })
      .eq('household_id', link.household_id);
  }
  // What the parents changed in Google comes back first; what it changes in the app is then
  // queued, and sent below like any other change.
  await pullChanges(db, link, today);
  const { data: queue } = await db
    .from('google_queue')
    .select('item_id, queued_at')
    .eq('household_id', link.household_id)
    .order('queued_at')
    .limit(batchSize);
  let lastError: string | null = null;
  const started = Date.now();
  for (const row of (queue ?? []) as { item_id: string; queued_at: string }[]) {
    // What is left waits for the next minute.
    if (Date.now() - started > sendingMs) {
      break;
    }
    try {
      await syncItem(db, link, row.item_id, today);
      // Done, unless it changed again meanwhile.
      await db
        .from('google_queue')
        .delete()
        .eq('item_id', row.item_id)
        .lte('queued_at', row.queued_at);
    } catch (caught) {
      if (caught instanceof LinkRevoked) {
        throw caught;
      }
      console.error(row.item_id, caught);
      lastError = caught instanceof Error ? caught.message : String(caught);
      // To the end of the queue, so one that keeps failing does not hold up the rest.
      await db
        .from('google_queue')
        .update({ queued_at: new Date().toISOString() })
        .eq('item_id', row.item_id)
        .eq('queued_at', row.queued_at);
    }
  }
  await db
    .from('google_links')
    .update({ last_sync_at: new Date().toISOString(), last_error: lastError })
    .eq('household_id', link.household_id);
}

async function syncLink(db: SupabaseClient, link: Link): Promise<void> {
  // One send at a time: two at once could make the same event twice.
  const { data: turn } = await db.rpc('google_take_turn', { p_household_id: link.household_id });
  if (turn !== true) {
    return;
  }
  try {
    await syncHousehold(db, link);
  } catch (caught) {
    const message =
      caught instanceof LinkRevoked
        ? 'revoked'
        : caught instanceof Error
          ? caught.message
          : String(caught);
    console.error(link.household_id, caught);
    await db
      .from('google_links')
      .update({ last_sync_at: new Date().toISOString(), last_error: message })
      .eq('household_id', link.household_id);
  } finally {
    await db
      .from('google_links')
      .update({ sending_until: null })
      .eq('household_id', link.household_id);
  }
}

// ---------------------------------------------------------------------------------------
// Changes made in Google: what a parent changed in the "משכן" calendar comes back to the app.
// Google says what changed since the last look (its sync token). A change of Mishkan's own
// is told by the etag kept when it was sent; anything else is compared with what was sent,
// field by field, and only what differs is brought back. What cannot be said in the app is
// put back in Google as it was.

type When = { date?: string; dateTime?: string; timeZone?: string };

type GoogleEvent = {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: When;
  end?: When;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: When;
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
  extendedProperties?: { private?: Record<string, string> };
};

type KeptRow = {
  item_id: string;
  key: string;
  event_id: string;
  etag: string | null;
  sent: EventBody | null;
  dismissed: boolean;
};

/** A start as a day and an hour in Israel; no hour for a whole day. */
function startOf(when: When | undefined): { day: string; time: string | null } | null {
  if (when?.dateTime !== undefined) {
    // What was sent has no offset (with the zone beside it); what Google returns has one.
    if (!/[zZ]|[+-]\d\d:\d\d$/.test(when.dateTime)) {
      return { day: when.dateTime.slice(0, 10), time: when.dateTime.slice(11, 16) };
    }
    return localOf(when.dateTime);
  }
  return when?.date === undefined ? null : { day: when.date, time: null };
}

function sameStart(a: When | undefined, b: When | undefined): boolean {
  const x = startOf(a);
  const y = startOf(b);
  return x !== null && y !== null && x.day === y.day && x.time === y.time;
}

function startMinutes(when: When | undefined): number | null {
  const start = startOf(when);
  return start === null ? null : minutesOf(start.day, start.time ?? '00:00');
}

/** The minutes before the start at which an event rings, as a sorted list. */
function ringMinutes(reminders: unknown): number[] {
  const value = reminders as GoogleEvent['reminders'] | undefined;
  if (value === undefined || value.useDefault === true) {
    return [];
  }
  return [...new Set((value.overrides ?? []).map((o) => o.minutes))].sort((a, b) => a - b);
}

function sentText(sent: EventBody, field: string): string {
  const value = sent[field];
  return typeof value === 'string' ? value : '';
}

/** Google's changes since the last look, and the mark for the next one. */
async function listChanges(
  db: SupabaseClient,
  link: Link,
): Promise<{ events: GoogleEvent[]; token: string | null }> {
  const events: GoogleEvent[] = [];
  let pageToken: string | null = null;
  // Without a mark yet, the calendar is read through only to get one: nothing before it is new.
  const first = link.sync_token === null;
  for (;;) {
    const params = new URLSearchParams({ maxResults: '250', showDeleted: 'true' });
    if (!first && link.sync_token !== null) {
      params.set('syncToken', link.sync_token);
    }
    if (pageToken !== null) {
      params.set('pageToken', pageToken);
    }
    let page: Record<string, unknown> | null;
    try {
      page = await google(db, link, 'GET', `${eventsPath(link)}?${params.toString()}`);
    } catch (caught) {
      // The mark is too old: read through again for a new one.
      if (caught instanceof GoogleError && caught.status === 410 && !first) {
        link.sync_token = null;
        return listChanges(db, link);
      }
      throw caught;
    }
    if (!first) {
      events.push(...((page?.items ?? []) as GoogleEvent[]));
    }
    if (typeof page?.nextPageToken === 'string') {
      pageToken = page.nextPageToken;
      continue;
    }
    return { events, token: typeof page?.nextSyncToken === 'string' ? page.nextSyncToken : null };
  }
}

/** Sends an event again as it should be: Google's change is not kept. */
async function putBack(db: SupabaseClient, link: Link, itemId: string, key: string) {
  await db.from('google_events').update({ fingerprint: '' }).eq('item_id', itemId).eq('key', key);
  await db.from('google_queue').upsert({
    item_id: itemId,
    household_id: link.household_id,
    queued_at: new Date().toISOString(),
  });
}

/** The parent the app's own functions act for: the one who connected, or any of the house. */
async function actingMember(db: SupabaseClient, link: Link): Promise<string> {
  if (link.connected_by !== null) {
    return link.connected_by;
  }
  const { data } = await db
    .from('members')
    .select('id')
    .eq('household_id', link.household_id)
    .limit(1)
    .maybeSingle();
  if (data === null) {
    throw new Error('no parent in the household');
  }
  return String((data as { id: string }).id);
}

/**
 * Notifications changed on an appointment: one added in Google is added as "before its
 * hour" (on a whole day, as a day before at an hour); one removed there is removed. Only
 * the reminders that were sent are compared: the others never reached Google.
 */
async function bringReminders(
  db: SupabaseClient,
  facts: ItemFacts,
  sentMinutes: number[],
  googleMinutes: number[],
  day: string,
  time: string | null,
  repeating: boolean,
): Promise<boolean> {
  const added = googleMinutes.filter((m) => !sentMinutes.includes(m));
  const removed = sentMinutes.filter((m) => !googleMinutes.includes(m));
  for (const minutes of removed) {
    const matching = facts.reminders.filter(
      (reminder) => notificationsFor([reminder], day, time, repeating)[0]?.minutes === minutes,
    );
    for (const reminder of matching) {
      await db.from('item_reminders').delete().eq('id', reminder.id);
    }
  }
  for (const minutes of added) {
    if (time !== null) {
      await db
        .from('item_reminders')
        .insert({ item_id: facts.item.id, rule: 'before', minutes_before: minutes });
    } else {
      const daysBefore = Math.ceil(minutes / 1440);
      const at = fromMinutes(daysBefore * 1440 - minutes).time;
      await db.from('item_reminders').insert({
        item_id: facts.item.id,
        rule: 'day',
        days_before: daysBefore,
        at_time: `${at}:00`,
      });
    }
  }
  return added.length > 0 || removed.length > 0;
}

/** Title and place changed on an appointment's event. */
async function bringDetails(db: SupabaseClient, item: Item, event: GoogleEvent, sent: EventBody) {
  const changes: Record<string, unknown> = {};
  const title = (event.summary ?? '').trim();
  if (title !== '' && title !== sentText(sent, 'summary')) {
    changes.title = title;
  }
  const place = (event.location ?? '').trim();
  if (place !== sentText(sent, 'location')) {
    // A meeting given by its link keeps it there; otherwise it is the place.
    const byLink = (item.place ?? '').trim() === '' && (item.meeting_url ?? '').trim() !== '';
    changes[byLink ? 'meeting_url' : 'place'] = place === '' ? null : place;
  }
  if (Object.keys(changes).length > 0) {
    await db.from('items').update(changes).eq('id', item.id);
  }
}

const unitOf: Record<string, Repeat['unit']> = {
  DAILY: 'day',
  WEEKLY: 'week',
  MONTHLY: 'month',
  YEARLY: 'year',
};

/**
 * A series' rule as the app keeps it, when the app can say it: every so many days, weeks,
 * months or years, on days of the week, up to a number of times or a day. The days of the
 * month (or year) must be those its first day implies, as Mishkan sent them.
 */
function parseRule(
  recurrence: readonly string[],
  sentRecurrence: readonly string[],
): {
  every: number;
  unit: Repeat['unit'];
  weekdays: number[];
  endKind: Repeat['end_kind'];
  endCount: number | null;
  endUntil: string | null;
} | null {
  const line = recurrence.find((r) => r.startsWith('RRULE:'));
  if (line === undefined || recurrence.some((r) => r.startsWith('RDATE'))) {
    return null;
  }
  const parts = new Map(
    line
      .slice(6)
      .split(';')
      .map((part) => part.split('=') as [string, string]),
  );
  const unit = unitOf[parts.get('FREQ') ?? ''];
  if (unit === undefined) {
    return null;
  }
  const sent = new Map(
    (sentRecurrence.find((r) => r.startsWith('RRULE:')) ?? 'RRULE:')
      .slice(6)
      .split(';')
      .map((part) => part.split('=') as [string, string]),
  );
  // Days of the month or a month other than those sent: the app has no such rule.
  for (const field of ['BYMONTHDAY', 'BYMONTH', 'BYSETPOS', 'BYYEARDAY', 'BYWEEKNO']) {
    if (parts.get(field) !== sent.get(field)) {
      return null;
    }
  }
  const byday = parts.get('BYDAY');
  const weekdays: number[] = [];
  if (byday !== undefined) {
    for (const code of byday.split(',')) {
      const index = weekdayCodes.indexOf(code);
      // "The second Tuesday" and the like: no such rule in the app.
      if (index === -1) {
        return null;
      }
      weekdays.push(index);
    }
  }
  const count = parts.get('COUNT');
  const until = parts.get('UNTIL');
  const untilDay =
    until === undefined
      ? null
      : until.includes('T')
        ? localOf(
            `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}T${until.slice(9, 11)}:${until.slice(11, 13)}:${until.slice(13, 15)}Z`,
          ).day
        : `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
  return {
    every: Math.max(1, Number(parts.get('INTERVAL') ?? '1')),
    unit,
    weekdays: unit === 'week' ? weekdays.sort() : [],
    endKind: count !== undefined ? 'count' : untilDay !== null ? 'until' : 'never',
    endCount: count === undefined ? null : Number(count),
    endUntil: count === undefined ? untilDay : null,
  };
}

/** A series' hour or rule changed in Google: the app's series is set the same. */
async function bringSeries(
  db: SupabaseClient,
  link: Link,
  facts: ItemFacts,
  event: GoogleEvent,
  sent: EventBody,
): Promise<boolean> {
  const repeat = facts.repeat;
  const start = startOf(event.start);
  const rule = parseRule(event.recurrence ?? [], (sent.recurrence as string[] | undefined) ?? []);
  if (
    repeat === null ||
    repeat.dates.length > 0 ||
    start === null ||
    start.time === null ||
    rule === null
  ) {
    return false;
  }
  const { error } = await db.rpc('google_save_repeat', {
    p_member_id: await actingMember(db, link),
    p_item_id: facts.item.id,
    p_every: rule.every,
    p_unit: rule.unit,
    p_times: [`${start.time}:00`],
    p_weekdays: rule.weekdays,
    p_end_kind: rule.endKind,
    p_end_count: rule.endCount,
    p_end_until: rule.endUntil,
  });
  if (error !== null) {
    console.error('series', facts.item.id, error.message);
    return false;
  }
  return true;
}

/**
 * A reminder moved by some minutes, as the fields of its rule; null when its rule cannot say
 * it (before the item's hour by less than nothing, or a repeating reminder).
 */
function shiftedReminder(reminder: Reminder, by: number): Record<string, unknown> | null {
  if (reminder.rule === 'at' && reminder.at !== null) {
    return { at: new Date(new Date(reminder.at).getTime() + by * 60000).toISOString() };
  }
  if (reminder.rule === 'before' && reminder.minutes_before !== null) {
    const minutes = reminder.minutes_before - by;
    return minutes < 0 ? null : { minutes_before: minutes };
  }
  if (reminder.rule === 'day' && reminder.at_time !== null) {
    // Its moment, counted from midnight of the item's day, moved; then said again as days
    // before and an hour.
    const [h, m] = hhmm(reminder.at_time).split(':').map(Number);
    const moment = (h ?? 0) * 60 + (m ?? 0) - (reminder.days_before ?? 0) * 1440 + by;
    const daysBefore = moment >= 0 ? 0 : Math.ceil(-moment / 1440);
    const at = moment + daysBefore * 1440;
    return at >= 1440 ? null : { days_before: daysBefore, at_time: `${fromMinutes(at).time}:00` };
  }
  return null;
}

/** Moves a reminder by as much as its 🔔 event was moved in Google. */
async function moveReminder(db: SupabaseClient, reminder: Reminder, by: number): Promise<boolean> {
  const fields = shiftedReminder(reminder, by);
  if (fields === null) {
    return false;
  }
  await db.from('item_reminders').update(fields).eq('id', reminder.id);
  return true;
}

/**
 * A notification added in Google to a 🔔 event ("an hour before" it): one more reminder in
 * the app, that much earlier than this one, for the same parents. It comes to the calendar
 * as a 🔔 of its own.
 */
async function addEarlier(db: SupabaseClient, reminder: Reminder, minutes: number): Promise<void> {
  const fields = shiftedReminder(reminder, -minutes);
  if (fields === null) {
    return;
  }
  await db.from('item_reminders').insert({
    item_id: reminder.item_id,
    rule: reminder.rule,
    member_ids: reminder.member_ids,
    ...fields,
  });
}

/** One occurrence of a series changed in Google. */
async function bringOccurrence(
  db: SupabaseClient,
  link: Link,
  facts: ItemFacts,
  master: KeptRow,
  event: GoogleEvent,
): Promise<void> {
  if (event.status === 'cancelled' || master.sent === null) {
    return;
  }
  const original = startOf(event.originalStartTime);
  const moved = !sameStart(event.start, event.originalStartTime);
  const sentRings = ringMinutes(master.sent.reminders);
  const ringsChanged = ringMinutes(event.reminders).join(',') !== sentRings.join(',');
  if (!moved && !ringsChanged) {
    return;
  }
  const { item, repeat } = facts;
  // The current occurrence of an appointment may move; the app moves only that one.
  const current =
    original !== null &&
    (original.day === item.due_date || (repeat !== null && original.day === repeat.planned_date));
  const start = startOf(event.start);
  if (moved && !master.key.startsWith('r:') && current && start !== null && start.time !== null) {
    const { error } = await db.rpc('google_move_occurrence', {
      p_member_id: await actingMember(db, link),
      p_item_id: item.id,
      p_date: start.day,
      p_time: `${start.time}:00`,
    });
    if (error === null) {
      if (!ringsChanged) {
        return;
      }
    } else {
      console.error('move', item.id, error.message);
    }
  }
  // Anything else on one occurrence is put back as the series has it.
  if (original === null) {
    return;
  }
  const back =
    original.time === null
      ? { start: { date: original.day }, end: { date: addDays(original.day, 1) } }
      : (() => {
          const end = fromMinutes(
            minutesOf(original.day, original.time) + (master.key.startsWith('r:') ? 0 : 60),
          );
          return {
            start: { dateTime: `${original.day}T${original.time}:00`, timeZone: zone },
            end: { dateTime: `${end.day}T${end.time}:00`, timeZone: zone },
          };
        })();
  await google(db, link, 'PATCH', eventsPath(link, event.id), {
    ...(moved && !current ? back : {}),
    reminders: master.sent.reminders,
  });
}

/** One change Google gave, brought back to the app (or put back in Google). */
async function bringChange(
  db: SupabaseClient,
  link: Link,
  event: GoogleEvent,
  byEvent: ReadonlyMap<string, KeptRow>,
  byKey: ReadonlyMap<string, KeptRow>,
  splitKeys: ReadonlySet<string>,
  today: string,
): Promise<void> {
  const mark = event.extendedProperties?.private ?? {};
  const itemId = mark.mishkanItem;
  const key = mark.mishkanKey;
  // Not one of Mishkan's: a parent's own event in this calendar.
  if (itemId === undefined || key === undefined) {
    return;
  }
  if (event.recurringEventId !== undefined) {
    const master = byEvent.get(event.recurringEventId);
    const facts = master === undefined ? null : await factsOf(db, itemId, today);
    if (master !== undefined && facts !== null) {
      await bringOccurrence(db, link, facts, master, event);
    }
    return;
  }
  const row = byEvent.get(event.id);
  if (row === undefined) {
    // "This and following" in Google: the rest of the series came as a new one. Its hour and
    // rule become the series'; the new event goes, and the series is sent whole again.
    const series = byKey.get(`${itemId}|${key}`);
    if (series?.sent != null && event.status !== 'cancelled' && event.recurrence !== undefined) {
      const facts = await factsOf(db, itemId, today);
      if (facts !== null) {
        await bringSeries(db, link, facts, event, series.sent);
      }
      await google(db, link, 'DELETE', eventsPath(link, event.id)).catch(() => undefined);
      await putBack(db, link, itemId, key);
    }
    return;
  }
  if (event.status === 'cancelled') {
    // Removed in Google: an appointment is taken out of the calendar; a 🔔 reminder only
    // leaves it, and stays in the app.
    if (key.startsWith('r:') || key === 'moved') {
      await db
        .from('google_events')
        .update({ dismissed: true })
        .eq('item_id', itemId)
        .eq('key', key);
    } else {
      await db
        .from('google_choices')
        .upsert({ item_id: itemId, household_id: link.household_id, included: false });
    }
    return;
  }
  if (event.etag !== undefined && event.etag === row.etag) {
    return;
  }
  const sent = row.sent;
  const facts = await factsOf(db, itemId, today);
  if (sent === null || facts === null) {
    return;
  }
  const moved = !sameStart(event.start, sent.start as When | undefined);
  const ringsChanged =
    ringMinutes(event.reminders).join(',') !== ringMinutes(sent.reminders).join(',');

  // A 🔔 reminder: its time may move; anything else is put back.
  if (key.startsWith('r:')) {
    const reminder = facts.reminders.find((r) => key.startsWith(`r:${r.id}`));
    // What follows the reminder's id: nothing, ":moved", an hour (and a weekday) of a series,
    // or one time laid out of many (put back: the app has no such reminder of its own).
    const rest = reminder === undefined ? '' : key.slice(`r:${reminder.id}`.length);
    const laidOut = rest.includes(':ahead') || /^:\d{4}-/.test(rest);
    const by =
      startMinutes(event.start) !== null && startMinutes(sent.start as When) !== null
        ? (startMinutes(event.start) ?? 0) - (startMinutes(sent.start as When) ?? 0)
        : 0;
    const kept =
      moved && reminder !== undefined && !laidOut && by !== 0
        ? await moveReminder(db, reminder, by)
        : false;
    // Notifications added to it ring earlier than it: each is one more reminder in the app.
    const sentRings = ringMinutes(sent.reminders);
    if (reminder !== undefined && !laidOut) {
      for (const minutes of ringMinutes(event.reminders)) {
        if (minutes > 0 && !sentRings.includes(minutes)) {
          await addEarlier(db, reminder, minutes);
        }
      }
    }
    // It goes back to ringing at its own time only; what else changed is put back.
    if (!kept || ringsChanged || (event.summary ?? '') !== sentText(sent, 'summary')) {
      await putBack(db, link, itemId, key);
    }
    return;
  }

  // An appointment.
  await bringDetails(db, facts.item, event, sent);
  const start = startOf(event.start);
  const repeating = key.startsWith('series:') || key === 'moved';
  if (moved && start !== null) {
    if (key === 'main') {
      await db
        .from('items')
        .update({
          due_date: start.day,
          starts_at:
            start.time === null || event.start?.dateTime === undefined
              ? null
              : new Date(event.start.dateTime).toISOString(),
        })
        .eq('id', itemId);
    } else if (key === 'moved' && start.time !== null) {
      const { error } = await db.rpc('google_move_occurrence', {
        p_member_id: await actingMember(db, link),
        p_item_id: itemId,
        p_date: start.day,
        p_time: `${start.time}:00`,
      });
      if (error !== null) {
        console.error('move', itemId, error.message);
        await putBack(db, link, itemId, key);
      }
    }
  }
  const seriesChanged =
    key.startsWith('series:') &&
    (moved ||
      (event.recurrence ?? []).join('\n') !==
        ((sent.recurrence as string[] | undefined) ?? []).join('\n'));
  // A series split in Google is taken from its new part; the old part is sent whole again.
  if (seriesChanged) {
    const brought = splitKeys.has(`${itemId}|${key}`)
      ? false
      : await bringSeries(db, link, facts, event, sent);
    if (!brought) {
      await putBack(db, link, itemId, key);
    }
  }
  if (ringsChanged && start !== null) {
    await bringReminders(
      db,
      facts,
      ringMinutes(sent.reminders),
      ringMinutes(event.reminders),
      start.day,
      start.time,
      repeating,
    );
  }
}

/** Reads what changed in Google since the last look, and brings it back to the app. */
async function pullChanges(db: SupabaseClient, link: Link, today: string): Promise<void> {
  // Events sent before what was sent was kept are sent once more, to keep it.
  const { data: unknown } = await db
    .from('google_events')
    .select('item_id')
    .eq('household_id', link.household_id)
    .is('sent', null);
  for (const row of (unknown ?? []) as { item_id: string }[]) {
    await db
      .from('google_events')
      .update({ fingerprint: '' })
      .eq('item_id', row.item_id)
      .is('sent', null);
    await db.from('google_queue').upsert({ item_id: row.item_id, household_id: link.household_id });
  }
  const { events, token } = await listChanges(db, link);
  if (events.length > 0) {
    const { data } = await db
      .from('google_events')
      .select('item_id, key, event_id, etag, sent, dismissed')
      .eq('household_id', link.household_id);
    const rows = (data ?? []) as KeptRow[];
    const byEvent = new Map(rows.map((row) => [row.event_id, row]));
    const byKey = new Map(rows.map((row) => [`${row.item_id}|${row.key}`, row]));
    // The series cut in two in Google: their new parts are handled first.
    const splits = events.filter(
      (event) =>
        event.recurrence !== undefined &&
        event.recurringEventId === undefined &&
        !byEvent.has(event.id) &&
        event.extendedProperties?.private?.mishkanItem !== undefined,
    );
    const splitKeys = new Set(
      splits.map(
        (event) =>
          `${event.extendedProperties?.private?.mishkanItem ?? ''}|${event.extendedProperties?.private?.mishkanKey ?? ''}`,
      ),
    );
    for (const event of [...splits, ...events.filter((event) => !splits.includes(event))]) {
      try {
        await bringChange(db, link, event, byEvent, byKey, splitKeys, today);
      } catch (caught) {
        console.error('change', event.id, caught);
      }
    }
  }
  if (token !== null) {
    link.sync_token = token;
    await db
      .from('google_links')
      .update({ sync_token: token })
      .eq('household_id', link.household_id);
  }
}

// ---------------------------------------------------------------------------------------
// Connecting and disconnecting.

async function loadLink(db: SupabaseClient, householdId: string): Promise<Link | null> {
  const { data } = await db
    .from('google_links')
    .select(linkColumns)
    .eq('household_id', householdId)
    .maybeSingle();
  return (data ?? null) as Link | null;
}

async function connect(
  db: SupabaseClient,
  householdId: string,
  memberId: string,
  code: string,
): Promise<void> {
  const tokens = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const refresh = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : null;
  const before = await loadLink(db, householdId);
  if (refresh === null && before === null) {
    throw new Error('Google gave no lasting access; connect again');
  }
  const link: Link = {
    household_id: householdId,
    refresh_token: refresh ?? before?.refresh_token ?? '',
    access_token: String(tokens.access_token),
    access_expires_at: new Date(
      Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
    ).toISOString(),
    calendar_id: before?.calendar_id ?? null,
    laid_out_on: null,
    sync_token: before?.sync_token ?? null,
    connected_by: memberId,
  };
  // The calendar made before, when it is still there; otherwise a new one.
  if (link.calendar_id !== null) {
    try {
      await google(db, link, 'GET', `/calendars/${encodeURIComponent(link.calendar_id)}`);
    } catch {
      link.calendar_id = null;
    }
  }
  if (link.calendar_id === null) {
    const made = await google(db, link, 'POST', '/calendars', { summary: 'משכן', timeZone: zone });
    link.calendar_id = String(made?.id ?? '');
    link.sync_token = null;
    await db.from('google_events').delete().eq('household_id', householdId);
  }
  await db.from('google_links').upsert({
    ...link,
    connected_by: memberId,
    connected_at: new Date().toISOString(),
    last_error: null,
  });
  // What goes to the calendar is looked at once: the appointments, and what was put in.
  const [{ data: appointments }, { data: chosen }] = await Promise.all([
    db.from('items').select('id').eq('household_id', householdId).eq('kind', 'appointment'),
    db.from('google_choices').select('item_id').eq('household_id', householdId),
  ]);
  const ids = new Set([
    ...((appointments ?? []) as { id: string }[]).map((row) => row.id),
    ...((chosen ?? []) as { item_id: string }[]).map((row) => row.item_id),
  ]);
  const rows = [...ids].map((id) => ({ item_id: id, household_id: householdId }));
  for (let i = 0; i < rows.length; i += 500) {
    await db.from('google_queue').upsert(rows.slice(i, i + 500));
  }
  // The events are sent by the next minute's run, not while the parent waits.
}

async function disconnect(db: SupabaseClient, householdId: string): Promise<void> {
  const link = await loadLink(db, householdId);
  if (link !== null) {
    // Google forgets the access; the calendar and its events stay in the account.
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(link.refresh_token)}`,
      {
        method: 'POST',
      },
    ).catch(() => undefined);
  }
  await db.from('google_queue').delete().eq('household_id', householdId);
  await db.from('google_events').delete().eq('household_id', householdId);
  await db.from('google_links').delete().eq('household_id', householdId);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      code?: unknown;
      state?: unknown;
    };

    // The cron job: every connected household's queue. It is answered at once and the
    // sending goes on after, so a caller that waits only a moment does not cut it short.
    if (body.action === 'cron') {
      const work = (async (): Promise<void> => {
        const { data: links } = await db.from('google_links').select(linkColumns);
        for (const link of (links ?? []) as Link[]) {
          await syncLink(db, link);
        }
      })().catch((caught: unknown) => {
        console.error(caught);
      });
      const runtime = (
        globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } }
      ).EdgeRuntime;
      if (runtime === undefined) {
        await work;
      } else {
        runtime.waitUntil(work);
      }
      return json({ ok: true }, 202);
    }

    // Everything else is for a signed-in parent, about their own household.
    const authorization = request.headers.get('Authorization') ?? '';
    const { data: auth } = await db.auth.getUser(authorization.replace('Bearer ', ''));
    if (auth.user === null) {
      return json({ error: 'not signed in' }, 401);
    }
    const { data: member } = await db
      .from('members')
      .select('id, household_id')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (member === null) {
      return json({ error: 'not a member' }, 403);
    }
    const householdId = String(member.household_id);

    if (body.action === 'start') {
      const state = typeof body.state === 'string' ? body.state : '';
      const params = new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
        state,
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
    }
    if (body.action === 'connect') {
      if (typeof body.code !== 'string' || body.code === '') {
        return json({ error: 'no code' }, 400);
      }
      await connect(db, householdId, String(member.id), body.code);
      return json({ ok: true });
    }
    if (body.action === 'disconnect') {
      await disconnect(db, householdId);
      return json({ ok: true });
    }
    if (body.action === 'sync') {
      const link = await loadLink(db, householdId);
      if (link !== null) {
        await syncLink(db, link);
      }
      return json({ ok: true });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (caught) {
    console.error(caught);
    return json({ error: caught instanceof Error ? caught.message : String(caught) }, 500);
  }
});

export { parseRule, planItem, startOf };
export type { ItemFacts };
