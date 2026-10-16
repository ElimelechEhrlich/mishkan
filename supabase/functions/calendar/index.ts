// Supabase Edge Function: a parent's Google Calendar feed. The calendar subscribes once to
// .../functions/v1/calendar?t=<code>, the private link from the app's settings, and fetches it
// again from time to time; the answer is an iCalendar file of the items the parent picked
// ("ביומן גוגל"). The code is the only key: Google sends no sign-in, so JWT verification must
// be off for this function. The database's calendar_events() checks the code and gives only
// what that parent may see. SUPABASE_URL and SUPABASE_ANON_KEY are provided; no secret needed.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

/** Where an event links back to, its item's page in the app. */
const appUrl = 'https://mishkan.vercel.app';

type CalendarEvent = {
  uid: string;
  item_id: string;
  title: string;
  notes: string | null;
  place: string | null;
  with_whom: string | null;
  on_date: string;
  starts: string | null;
  done: boolean;
};

/** Text as iCalendar wants it: backslashes, commas, semicolons and line breaks escaped. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** A line folded at 75 bytes, never inside a character (Hebrew takes two bytes or more). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** 2026-10-16 as 20261016. */
function dateValue(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/** A moment in UTC, as 20261016T073000Z. */
function utcValue(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function eventLines(event: CalendarEvent, stamp: string): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${event.uid}@mishkan`, `DTSTAMP:${stamp}`];
  if (event.starts === null) {
    lines.push(
      `DTSTART;VALUE=DATE:${dateValue(event.on_date)}`,
      `DTEND;VALUE=DATE:${dateValue(nextDay(event.on_date))}`,
    );
  } else {
    // An hour long: the app keeps no length.
    const starts = new Date(event.starts);
    lines.push(
      `DTSTART:${utcValue(starts)}`,
      `DTEND:${utcValue(new Date(starts.getTime() + 60 * 60 * 1000))}`,
    );
  }
  lines.push(`SUMMARY:${escapeText(`${event.done ? '✓ ' : ''}${event.title}`)}`);
  if (event.place !== null && event.place.trim() !== '') {
    lines.push(`LOCATION:${escapeText(event.place.trim())}`);
  }
  const link = `${appUrl}/item/${event.item_id}`;
  const description = [
    event.with_whom === null || event.with_whom.trim() === ''
      ? null
      : `עם: ${event.with_whom.trim()}`,
    event.notes === null || event.notes.trim() === '' ? null : event.notes.trim(),
    `במשכן: ${link}`,
  ].filter((part) => part !== null);
  lines.push(`DESCRIPTION:${escapeText(description.join('\n'))}`, `URL:${link}`);
  // A whole day does not mark the day busy; an hour does.
  lines.push(
    'STATUS:CONFIRMED',
    `TRANSP:${event.starts === null ? 'TRANSPARENT' : 'OPAQUE'}`,
    'END:VEVENT',
  );
  return lines;
}

Deno.serve(async (request) => {
  const token = new URL(request.url).searchParams.get('t') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return new Response('not found', { status: 404 });
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );
  const { data, error } = await db.rpc('calendar_events', { p_token: token });
  if (error !== null) {
    console.error(error);
    return new Response('error', { status: 500 });
  }
  const events = (data ?? []) as CalendarEvent[];
  const stamp = utcValue(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mishkan//calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:משכן',
    'X-WR-TIMEZONE:Asia/Jerusalem',
    // A hint to fetch again within the hour; Google decides on its own.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flatMap((event) => eventLines(event, stamp)),
    'END:VCALENDAR',
  ];
  return new Response(`${lines.map(fold).join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
});
