-- =====================================================================
-- 0033 - An optional hour for a task, and several reminders per item
-- 1. A task (or a step) with a date can also have an hour. Not required.
-- 2. Reminders move to their own table, several per item, each with its own
--    recipients. A reminder rings at a set date and hour, at a time relative
--    to the item's date and hour ("an hour before", "a day before at 20:00"),
--    or again and again ("every week at 09:00", until a date or until the
--    item is closed). A relative reminder follows the item: when its date or
--    hour moves, so does the reminder; when the item has no date or hour left,
--    the reminder waits for one, and nothing is deleted.
-- 3. A new appointment gets two reminders, a day before and an hour before,
--    which can be changed or removed like any other.
-- 4. What exists moves over: every item's reminder (with its recipients; on a
--    repeating task as "on the day at HH:MM" relative to its date), and the
--    reminders of every appointment. Birthday and anniversary reminders go on
--    as today. Nothing is deleted.
-- The send-reminders edge function needs no change: it calls the same two
-- functions, which now read the new table.
-- Run once in the Supabase SQL editor, after 0032.
-- =====================================================================

-- ---------- 1. An optional hour -------------------------------------
alter table public.items add column due_time time;

-- An hour has no meaning without a date.
create function public.items_clear_due_time() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.due_date is null then
    new.due_time := null;
  end if;
  return new;
end $$;

create trigger items_clear_due_time
  before insert or update of due_date, due_time on public.items
  for each row execute function public.items_clear_due_time();

-- ---------- 2. Reminders --------------------------------------------
create type public.reminder_rule as enum ('at', 'before', 'day', 'repeat');
create type public.repeat_unit as enum ('day', 'week', 'month', 'year');

create table public.item_reminders (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.items(id) on delete cascade,
  rule           public.reminder_rule not null,
  -- 'at': when it rings. 'repeat': its first ring.
  at             timestamptz,
  -- 'before': how long before the item's hour (0 = at the hour itself).
  minutes_before integer,
  -- 'day': how many days before the item's date, and at what hour.
  days_before    integer,
  at_time        time,
  -- 'repeat': every how many of what, and until which day (null = until the item is closed).
  every          integer,
  unit           public.repeat_unit,
  until          date,
  -- Who gets it; null = every parent who can see the item.
  member_ids     uuid[],
  -- Kept by the server: the next ring (null = waiting for a date or hour, or no more rings),
  -- the ring last sent, and when it was sent.
  due_at         timestamptz,
  sent_for       timestamptz,
  sent_at        timestamptz,
  -- Made from the item's old single reminder (remind_at); kept in step with it.
  legacy         boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint item_reminders_at check (rule <> 'at' or at is not null),
  constraint item_reminders_before check (
    rule <> 'before' or (minutes_before is not null and minutes_before >= 0)),
  constraint item_reminders_day check (
    rule <> 'day' or (days_before is not null and days_before >= 0 and at_time is not null)),
  constraint item_reminders_repeat check (
    rule <> 'repeat' or (at is not null and every is not null and every >= 1 and unit is not null))
);

create index item_reminders_item_idx on public.item_reminders (item_id);
create index item_reminders_due_idx on public.item_reminders (due_at) where due_at is not null;
create unique index item_reminders_legacy_idx on public.item_reminders (item_id) where legacy;

-- The first ring of a repeating reminder that comes after a moment, or null when it would
-- come after its last day. Counted in Israel time from the first ring, so "every month on the
-- 31st" rings on the last day of a short month and on the 31st again after it.
create function public.reminder_next_ring(
  p_start timestamptz,
  p_every integer,
  p_unit  public.repeat_unit,
  p_after timestamptz,
  p_until date
) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  v_local timestamp := p_start at time zone 'Asia/Jerusalem';
  v_step  interval := case p_unit
                        when 'day'   then make_interval(days => p_every)
                        when 'week'  then make_interval(weeks => p_every)
                        when 'month' then make_interval(months => p_every)
                        else make_interval(years => p_every)
                      end;
  -- The longest a step can be, so the first guess never passes the ring looked for.
  v_most  numeric := p_every * case p_unit
                                 when 'day'   then 90000
                                 when 'week'  then 608400
                                 when 'month' then 2682000
                                 else 31626000
                               end;
  v_count integer := 0;
  v_ring  timestamptz;
  v_tries integer := 0;
begin
  if p_start <= p_after then
    v_count := greatest(0, floor(extract(epoch from (p_after - p_start)) / v_most)::integer - 1);
  end if;
  loop
    v_ring := (v_local + v_step * v_count) at time zone 'Asia/Jerusalem';
    exit when v_ring > p_after;
    v_count := v_count + 1;
    v_tries := v_tries + 1;
    if v_tries > 10000 then
      return null;
    end if;
  end loop;
  if p_until is not null and (v_ring at time zone 'Asia/Jerusalem')::date > p_until then
    return null;
  end if;
  return v_ring;
end $$;

-- When a relative reminder rings, by the item's date and hour; null when the item has no date
-- (or, for "before", no hour). Only a task, a goal or an appointment has a time of its own.
create function public.reminder_relative_ring(
  p_rule           public.reminder_rule,
  p_minutes_before integer,
  p_days_before    integer,
  p_at_time        time,
  p_item           public.items
) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  v_dated boolean := p_item.kind in ('task', 'goal')
                     and p_item.time_mode in ('scheduled', 'recurring')
                     and p_item.due_date is not null;
  v_hour  timestamptz;
  v_day   date;
begin
  if p_item.kind = 'appointment' then
    v_hour := p_item.starts_at;
    v_day  := (p_item.starts_at at time zone 'Asia/Jerusalem')::date;
  elsif v_dated then
    v_day := p_item.due_date;
    if p_item.due_time is not null then
      v_hour := (p_item.due_date + p_item.due_time) at time zone 'Asia/Jerusalem';
    end if;
  end if;
  if p_rule = 'before' then
    return v_hour - make_interval(mins => p_minutes_before);
  end if;
  return ((v_day - p_days_before) + p_at_time) at time zone 'Asia/Jerusalem';
end $$;

-- Keeps each reminder's next ring. A relative reminder whose ring has already passed when it
-- is set (or when the item moves) does not ring late; a set time in the past rings at once,
-- as before.
create function public.item_reminders_ring() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.items%rowtype;
begin
  if new.rule = 'repeat' then
    if tg_op = 'INSERT'
       or (new.rule, new.at, new.every, new.unit, new.until)
          is distinct from (old.rule, old.at, old.every, old.unit, old.until) then
      new.sent_for := null;
      new.due_at := public.reminder_next_ring(
        new.at, new.every, new.unit, now() - interval '1 minute', new.until);
    elsif new.sent_for is distinct from old.sent_for then
      -- Sent (or given back to be sent again): the ring after the one sent.
      new.due_at := public.reminder_next_ring(
        new.at, new.every, new.unit, coalesce(new.sent_for, now() - interval '1 minute'),
        new.until);
    else
      new.due_at := old.due_at;
    end if;
    return new;
  end if;

  if new.rule = 'at' then
    new.due_at := new.at;
    return new;
  end if;

  select * into v_item from public.items where id = new.item_id;
  new.due_at := public.reminder_relative_ring(
    new.rule, new.minutes_before, new.days_before, new.at_time, v_item);
  if (tg_op = 'INSERT' or new.due_at is distinct from old.due_at)
     and new.due_at <= now() then
    new.sent_for := new.due_at;
  end if;
  return new;
end $$;

create trigger item_reminders_ring
  before insert or update on public.item_reminders
  for each row execute function public.item_reminders_ring();

-- A relative reminder follows its item's date, hour and kind.
create function public.items_move_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.item_reminders
  set item_id = item_id
  where item_id = new.id and rule in ('before', 'day');
  return null;
end $$;

create trigger items_move_reminders
  after update of due_date, due_time, starts_at, time_mode, kind on public.items
  for each row
  when ((new.due_date, new.due_time, new.starts_at, new.time_mode, new.kind)
        is distinct from (old.due_date, old.due_time, old.starts_at, old.time_mode, old.kind))
  execute function public.items_move_reminders();

-- A parent sees, adds, changes and removes the reminders of the items they can see. The
-- server alone keeps when each rings and whether it was sent.
alter table public.item_reminders enable row level security;

create policy item_reminders_all on public.item_reminders for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

grant select, delete on public.item_reminders to authenticated;
grant insert (id, item_id, rule, at, minutes_before, days_before, at_time, every, unit, until,
              member_ids)
  on public.item_reminders to authenticated;
grant update (rule, at, minutes_before, days_before, at_time, every, unit, until, member_ids)
  on public.item_reminders to authenticated;

-- ---------- The old single reminder keeps working -------------------
-- Birthday and anniversary reminders, and a device still running the previous version of the
-- app, set items.remind_at and items.remind_member_ids. Each item's old reminder is one
-- reminder in the new table, kept in step with them. On a repeating task it is relative to its
-- date, so it moves with it.
create function public.items_legacy_reminder() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_local timestamp;
begin
  if tg_op = 'UPDATE'
     and new.remind_at is not distinct from old.remind_at
     and new.remind_member_ids is not distinct from old.remind_member_ids then
    return null;
  end if;

  if new.remind_at is null then
    delete from public.item_reminders where item_id = new.id and legacy;
    return null;
  end if;

  if tg_op = 'UPDATE' and new.remind_at is not distinct from old.remind_at then
    -- Only the recipients changed.
    update public.item_reminders
    set member_ids = new.remind_member_ids
    where item_id = new.id and legacy;
    return null;
  end if;

  delete from public.item_reminders where item_id = new.id and legacy;
  v_local := new.remind_at at time zone 'Asia/Jerusalem';
  if new.time_mode = 'recurring' and new.due_date is not null and v_local::date <= new.due_date then
    insert into public.item_reminders (item_id, rule, days_before, at_time, member_ids, legacy)
    values (new.id, 'day', new.due_date - v_local::date, v_local::time, new.remind_member_ids,
            true);
  else
    insert into public.item_reminders (item_id, rule, at, member_ids, legacy)
    values (new.id, 'at', new.remind_at, new.remind_member_ids, true);
  end if;
  return null;
end $$;

create trigger items_legacy_reminder
  after insert or update of remind_at, remind_member_ids on public.items
  for each row execute function public.items_legacy_reminder();

-- ---------- 3. A new appointment reminds a day and an hour before ---
-- Replaces the fixed appointment reminders; the old table is kept as it was.
create or replace function public.items_appointment_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind::text = 'appointment'
     and (tg_op = 'INSERT' or old.kind::text <> 'appointment')
     and not exists (select 1 from public.item_reminders r where r.item_id = new.id) then
    insert into public.item_reminders (item_id, rule, minutes_before, member_ids)
    values (new.id, 'before', 1440, new.remind_member_ids),
           (new.id, 'before', 60, new.remind_member_ids);
  end if;
  return null;
end $$;

-- ---------- Sending -------------------------------------------------
-- The line a reminder is sent with: the item's title, after when it is due when that helps
-- ("in an hour", "tomorrow at 16:00").
create function public.reminder_title(
  p_reminder public.item_reminders,
  p_item     public.items,
  p_ring     timestamptz
) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_minutes integer := p_reminder.minutes_before;
  v_days    integer := p_reminder.days_before;
  v_event   timestamptz;
  v_gap     integer;
  v_hour    text := '';
  v_when    text;
begin
  if p_reminder.rule = 'before' then
    v_event := p_ring + make_interval(mins => v_minutes);
    v_when := case
      when v_minutes = 0 then 'עכשיו'
      when v_minutes = 60 then 'בעוד שעה'
      when v_minutes = 120 then 'בעוד שעתיים'
      when v_minutes < 1440 and v_minutes % 60 = 0 then 'בעוד ' || (v_minutes / 60) || ' שעות'
      when v_minutes < 1440 then 'בעוד ' || v_minutes || ' דקות'
      else null
    end;
    if v_when is null then
      v_gap := (v_event at time zone 'Asia/Jerusalem')::date
               - (p_ring at time zone 'Asia/Jerusalem')::date;
      v_when := case v_gap
                  when 0 then 'היום'
                  when 1 then 'מחר'
                  else 'ב־' || to_char(v_event at time zone 'Asia/Jerusalem', 'FMDD.FMMM')
                end
                || ' ב־' || to_char(v_event at time zone 'Asia/Jerusalem', 'HH24:MI');
    end if;
    return v_when || ' · ' || p_item.title;
  end if;

  if p_reminder.rule = 'day' then
    if p_item.kind = 'appointment' then
      v_hour := ' ב־' || to_char(p_item.starts_at at time zone 'Asia/Jerusalem', 'HH24:MI');
    elsif p_item.due_time is not null then
      v_hour := ' ב־' || to_char(p_item.due_time, 'HH24:MI');
    end if;
    v_when := case
      when v_days = 0 and v_hour = '' then null
      when v_days = 0 then 'היום' || v_hour
      when v_days = 1 then 'מחר' || v_hour
      when v_days = 2 then 'בעוד יומיים' || v_hour
      when v_days = 7 then 'בעוד שבוע' || v_hour
      when v_days = 14 then 'בעוד שבועיים' || v_hour
      when v_days % 7 = 0 then 'בעוד ' || (v_days / 7) || ' שבועות' || v_hour
      else 'בעוד ' || v_days || ' ימים' || v_hour
    end;
    return coalesce(v_when || ' · ', '') || p_item.title;
  end if;

  return p_item.title;
end $$;

-- For the edge function only: takes the reminders that are due, marks them sent, and returns
-- one row per device that should get each. A parent gets a reminder when they can see the item
-- (everyone for shared entities, the owner for a personal entity, and for an item without a
-- domain, the parent completing it) and the reminder is for them.
create or replace function public.claim_due_reminders()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with due as (
    update public.item_reminders r
    set sent_for = r.due_at,
        sent_at  = now()
    from public.items i
    where r.item_id = i.id
      and r.due_at <= now()
      and r.sent_for is distinct from r.due_at
      and i.status = 'open'
      and i.hidden = false
    returning i.id, public.reminder_title(r, i, r.sent_for) as title,
      i.household_id, i.domain_id, i.review_by, r.member_ids
  ),
  recipients as (
    select d.id, d.title, m.id as member_id
    from due d
    join public.members m on m.household_id = d.household_id and m.user_id is not null
    left join public.domains dm on dm.id = d.domain_id
    left join public.entities e on e.id = dm.entity_id
    where ((d.domain_id is null and m.id = d.review_by)
        or (d.domain_id is not null and (e.kind <> 'personal' or e.member_id = m.id)))
      and (d.member_ids is null or m.id = any (d.member_ids))
  )
  select r.id, r.title, s.endpoint, s.p256dh, s.auth
  from recipients r
  join public.push_subscriptions s on s.member_id = r.member_id
$$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;

-- For the edge function only: makes an item's reminders that were sent in the last quarter of an
-- hour due again, after they reached none of its devices. A repeating one goes back one ring.
create or replace function public.release_reminder(p_item_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.item_reminders
  set sent_for = case when rule = 'repeat' then sent_for - interval '1 second' end
  where item_id = p_item_id
    and sent_for is not null
    and sent_at > now() - interval '15 minutes'
$$;

revoke execute on function public.release_reminder(uuid) from public, anon, authenticated;
grant execute on function public.release_reminder(uuid) to service_role;

-- ---------- 4. What exists moves over -------------------------------
-- Each item's reminder, sent or not as it was.
insert into public.item_reminders (item_id, rule, at, days_before, at_time, member_ids, legacy)
select i.id,
       case when x.relative then 'day' else 'at' end::public.reminder_rule,
       case when x.relative then null else i.remind_at end,
       case when x.relative then i.due_date - x.local_at::date end,
       case when x.relative then x.local_at::time end,
       i.remind_member_ids,
       true
from public.items i
cross join lateral (
  select i.remind_at at time zone 'Asia/Jerusalem' as local_at
) l
cross join lateral (
  select l.local_at,
         i.time_mode = 'recurring' and i.due_date is not null
         and l.local_at::date <= i.due_date as relative
) x
where i.remind_at is not null;

update public.item_reminders r
set sent_for = case when i.reminder_sent_at is not null then r.due_at end
from public.items i
where r.item_id = i.id and r.legacy;

-- Every appointment's day-before and hour-before reminders. One already sent, or whose time
-- has passed, stays sent; one still waiting to be sent stays waiting.
insert into public.item_reminders (item_id, rule, minutes_before, member_ids)
select i.id, 'before', m.minutes, i.remind_member_ids
from public.items i
cross join (values (1440), (60)) as m(minutes)
where i.kind = 'appointment' and i.starts_at is not null;

update public.item_reminders r
set sent_for = case when a.sent_at is null then null else r.due_at end
from public.items i, public.appointment_reminders a
where r.item_id = i.id
  and i.kind = 'appointment'
  and r.rule = 'before'
  and a.item_id = i.id
  and a.lead = case r.minutes_before when 1440 then 'day' else 'hour' end
  and a.remind_at = r.due_at;
