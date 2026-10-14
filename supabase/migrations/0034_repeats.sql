-- =====================================================================
-- 0034 - Repeating, part one: an open rhythm, an end, and occurrences
-- 1. A repeating task repeats every N days, weeks, months or years, at an hour
--    if it has one, from a first day, forever, a number of times or until a
--    day. It can be stopped and continued, and its settings changed at any
--    time; a change applies from now on.
-- 2. Each time it falls due is an occurrence, marked on its own: done or
--    skipped. An occurrence left unmarked when the next one arrives is
--    recorded as missed. The item itself is closed only when a parent marks
--    it; when its occurrences have run out it waits for that.
-- 3. items.due_date is always the day of the current open occurrence (and
--    items.due_time its hour), so lists, reminders and the morning look work
--    as before; a reminder now rings for every occurrence, marked or not.
-- 4. What exists moves over: every repeating task keeps its rhythm and date,
--    and each time it was done becomes a done occurrence. Nothing in the past
--    is recorded as missed. Nothing is deleted.
-- A device still on the previous version of the app keeps working: marking a
-- repeating task done there marks its occurrence.
-- The send-reminders edge function needs no change.
-- Run once in the Supabase SQL editor, after 0033.
-- =====================================================================

-- ---------- 1. The rhythm -------------------------------------------
create type public.repeat_end as enum ('never', 'count', 'until');
create type public.occurrence_status as enum ('done', 'skipped', 'missed', 'closed_with_parent');

create table public.item_repeats (
  item_id     uuid primary key references public.items(id) on delete cascade,
  every       integer not null default 1 check (every between 1 and 1000),
  unit        public.repeat_unit not null,
  -- The first occurrence; the rhythm counts from it.
  starts_on   date not null,
  at_time     time,
  end_kind    public.repeat_end not null default 'never',
  end_count   integer check (end_count between 1 and 10000),
  end_until   date,
  -- Set by "stop repeating": no occurrence after this day.
  stopped_on  date,
  -- Occurrences before this day that went by unmarked are not recorded as missed (the time
  -- before a series moved over, or while it was stopped).
  missed_from date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  updated_at  timestamptz not null default now(),
  constraint item_repeats_count check (end_kind <> 'count' or end_count is not null),
  constraint item_repeats_until check (end_kind <> 'until' or end_until is not null)
);

create table public.occurrences (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  on_date    date not null,
  at_time    time,
  status     public.occurrence_status not null,
  done_by    uuid references public.members(id) on delete set null,
  done_at    timestamptz not null default now()
);
create index occurrences_item_idx on public.occurrences (item_id, on_date desc);
create index occurrences_done_at_idx on public.occurrences (done_at desc);

-- Read by whoever sees the item; written only through the functions below.
alter table public.item_repeats enable row level security;
alter table public.occurrences enable row level security;
create policy item_repeats_read on public.item_repeats for select to authenticated
  using (public.can_see_item(item_id));
create policy occurrences_read on public.occurrences for select to authenticated
  using (public.can_see_item(item_id));
grant select on public.item_repeats, public.occurrences to authenticated;

-- ---------- Counting the rhythm -------------------------------------
-- The first day of the rhythm after `p_after` (or on it, when `p_inclusive`), counted from the
-- first occurrence so a monthly rhythm on the 31st keeps the 31st after a short month.
create function public.repeat_day_after(
  p_starts    date,
  p_every     integer,
  p_unit      public.repeat_unit,
  p_after     date,
  p_inclusive boolean
) returns date
language plpgsql immutable set search_path = '' as $$
declare
  v_step  interval := case p_unit
                        when 'day'   then make_interval(days => p_every)
                        when 'week'  then make_interval(weeks => p_every)
                        when 'month' then make_interval(months => p_every)
                        else make_interval(years => p_every)
                      end;
  -- The longest a step can be in days, so the first guess never passes the day looked for.
  v_most  integer := p_every * case p_unit when 'day' then 1 when 'week' then 7
                                           when 'month' then 31 else 366 end;
  v_count integer := 0;
  v_day   date;
  v_tries integer := 0;
begin
  if p_after >= p_starts then
    v_count := greatest(0, (p_after - p_starts) / v_most - 1);
  end if;
  loop
    v_day := (p_starts + v_step * v_count)::date;
    exit when v_day > p_after or (p_inclusive and v_day = p_after);
    v_count := v_count + 1;
    v_tries := v_tries + 1;
    if v_tries > 100000 then
      return null;
    end if;
  end loop;
  return v_day;
end $$;

-- How many occurrences of an item have been marked or recorded.
create function public.occurrence_count(p_item_id uuid) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer from public.occurrences where item_id = p_item_id
$$;

-- The first occurrence from today (or from the first day, when later) that was not already
-- marked: a series set again or continued never repeats a day it already had.
create function public.repeat_first(p_rep public.item_repeats, p_marked integer) returns date
language plpgsql stable set search_path = '' as $$
declare
  v_from date := greatest(public.today_in_israel(), p_rep.starts_on);
  v_last date;
begin
  select max(o.on_date) into v_last from public.occurrences o where o.item_id = p_rep.item_id;
  if v_last is not null and v_last >= v_from then
    return public.repeat_next(p_rep, v_last, false, p_marked);
  end if;
  return public.repeat_next(p_rep, v_from, true, p_marked);
end $$;

-- The next occurrence after `p_after` (or on it, when `p_inclusive`) that the series still
-- has, given its end and whether it was stopped; null when there is none. `p_marked` is how
-- many occurrences count as used up so far.
create function public.repeat_next(
  p_rep       public.item_repeats,
  p_after     date,
  p_inclusive boolean,
  p_marked    integer
) returns date
language plpgsql immutable set search_path = '' as $$
declare
  v_day date;
begin
  if p_rep.end_kind = 'count' and p_marked >= p_rep.end_count then
    return null;
  end if;
  v_day := public.repeat_day_after(p_rep.starts_on, p_rep.every, p_rep.unit, p_after, p_inclusive);
  if v_day is null
     or (p_rep.end_kind = 'until' and v_day > p_rep.end_until)
     or (p_rep.stopped_on is not null and v_day > p_rep.stopped_on) then
    return null;
  end if;
  return v_day;
end $$;

-- The rule an older version of the app reads.
create function public.repeat_rule(p_every integer, p_unit public.repeat_unit) returns text
language sql immutable set search_path = '' as $$
  select 'FREQ=' || case p_unit when 'day' then 'DAILY' when 'week' then 'WEEKLY'
                                when 'month' then 'MONTHLY' else 'YEARLY' end
         || case when p_every > 1 then ';INTERVAL=' || p_every else '' end
$$;

create function public.today_in_israel() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Jerusalem')::date
$$;

-- An item the caller may change, and its series; raises otherwise.
create function public.repeat_of(p_item_id uuid) returns public.item_repeats
language plpgsql stable security definer set search_path = '' as $$
declare
  v_rep public.item_repeats%rowtype;
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  return v_rep;
end $$;

-- ---------- Moving on: unmarked occurrences become missed ------------
-- When the next occurrence of an item has arrived and the current one was left unmarked, the
-- current one is recorded as missed and the item moves on. The last occurrence of a series
-- stays open until it is marked.
create function public.roll_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.items%rowtype;
  v_rep    public.item_repeats%rowtype;
  v_today  date := public.today_in_israel();
  v_marked integer;
  v_next   date;
  v_due    date;
  v_tries  integer := 0;
begin
  select * into v_item from public.items where id = p_item_id for update;
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  if v_rep.item_id is null or v_item.status <> 'open' or v_item.time_mode <> 'recurring'
     or v_item.due_date is null or v_item.due_date >= v_today then
    return;
  end if;
  v_due := v_item.due_date;
  v_marked := public.occurrence_count(p_item_id);
  loop
    -- Is there an occurrence after the current one, already arrived?
    v_next := public.repeat_next(v_rep, v_due, false, v_marked + 1);
    exit when v_next is null or v_next > v_today;
    if v_due >= v_rep.missed_from and not exists (
         select 1 from public.occurrences o where o.item_id = p_item_id and o.on_date = v_due) then
      insert into public.occurrences (item_id, on_date, at_time, status)
      values (p_item_id, v_due, v_item.due_time, 'missed');
      v_marked := v_marked + 1;
    end if;
    v_due := v_next;
    v_tries := v_tries + 1;
    exit when v_tries > 1000;
  end loop;
  if v_due <> v_item.due_date then
    update public.items set due_date = v_due where id = p_item_id;
  end if;
end $$;

create function public.roll_occurrences() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  for v_id in
    select i.id from public.items i
    join public.item_repeats r on r.item_id = i.id
    where i.status = 'open' and i.time_mode = 'recurring'
      and i.due_date < public.today_in_israel()
  loop
    perform public.roll_item(v_id);
  end loop;
end $$;

revoke execute on function public.roll_item(uuid) from public, anon, authenticated;
revoke execute on function public.roll_occurrences() from public, anon, authenticated;

-- ---------- Setting, stopping and continuing a series ---------------
-- Makes the item repeat with these settings, or changes them. A change applies from now on:
-- what was marked stays, and an occurrence already due and unmarked stays to be marked. A
-- number of times can not be set below what has already gone by.
create function public.set_repeat(
  p_item_id   uuid,
  p_every     integer,
  p_unit      public.repeat_unit,
  p_starts_on date,
  p_at_time   time,
  p_end_kind  public.repeat_end,
  p_end_count integer,
  p_end_until date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item    public.items%rowtype;
  v_old     public.item_repeats%rowtype;
  v_rep     public.item_repeats%rowtype;
  v_today   date := public.today_in_israel();
  v_marked  integer;
  v_keep    boolean;
  v_gone    integer;
  v_due     date;
begin
  v_old := public.repeat_of(p_item_id);
  select * into v_item from public.items where id = p_item_id for update;
  if v_item.kind <> 'task' then
    raise exception 'only a task repeats';
  end if;
  v_marked := public.occurrence_count(p_item_id);
  -- The current occurrence, when it is already due and unmarked, stays as it is.
  v_keep := v_item.time_mode = 'recurring' and v_old.item_id is not null
            and v_item.due_date is not null and v_item.due_date <= v_today;
  v_gone := v_marked + (case when v_keep then 1 else 0 end);
  if p_end_kind = 'count' and p_end_count < v_gone then
    raise exception 'the number of times can not be less than those already gone by';
  end if;

  insert into public.item_repeats as r
    (item_id, every, unit, starts_on, at_time, end_kind, end_count, end_until, stopped_on,
     missed_from, updated_at)
  values (p_item_id, p_every, p_unit, p_starts_on, p_at_time, p_end_kind,
          case when p_end_kind = 'count' then p_end_count end,
          case when p_end_kind = 'until' then p_end_until end,
          null, v_today, now())
  on conflict (item_id) do update
    set every = excluded.every, unit = excluded.unit, starts_on = excluded.starts_on,
        at_time = excluded.at_time, end_kind = excluded.end_kind,
        end_count = excluded.end_count, end_until = excluded.end_until,
        -- Changing the settings of a series that was stopped does not start it again.
        stopped_on = r.stopped_on,
        missed_from = greatest(r.missed_from, excluded.missed_from),
        updated_at = now()
  returning * into v_rep;

  if v_keep then
    v_due := v_item.due_date;
  else
    v_due := public.repeat_first(v_rep, v_marked);
  end if;

  update public.items
  set time_mode = 'recurring',
      recurrence_rule = public.repeat_rule(p_every, p_unit),
      due_date = v_due,
      due_time = case when v_due is null then null else p_at_time end
  where id = p_item_id;
end $$;

-- "Stop repeating": nothing new from today; an occurrence already due stays to be marked.
create function public.stop_repeat(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep   public.item_repeats%rowtype;
  v_today date := public.today_in_israel();
begin
  v_rep := public.repeat_of(p_item_id);
  if v_rep.item_id is null then
    raise exception 'the item does not repeat';
  end if;
  update public.item_repeats set stopped_on = v_today, updated_at = now()
  where item_id = p_item_id;
  update public.items set due_date = null
  where id = p_item_id and time_mode = 'recurring' and due_date > v_today;
end $$;

-- "Continue repeating", with a new end (or the one it had): from the next occurrence from
-- today; the time in between is not recorded as missed.
create function public.resume_repeat(
  p_item_id   uuid,
  p_end_kind  public.repeat_end,
  p_end_count integer,
  p_end_until date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep    public.item_repeats%rowtype;
  v_item   public.items%rowtype;
  v_today  date := public.today_in_israel();
  v_marked integer;
  v_due    date;
begin
  v_rep := public.repeat_of(p_item_id);
  if v_rep.item_id is null then
    raise exception 'the item does not repeat';
  end if;
  select * into v_item from public.items where id = p_item_id for update;
  v_marked := public.occurrence_count(p_item_id);
  if p_end_kind = 'count' and p_end_count <= v_marked then
    raise exception 'the number of times must be more than those already gone by';
  end if;
  update public.item_repeats
  set stopped_on = null,
      end_kind = p_end_kind,
      end_count = case when p_end_kind = 'count' then p_end_count end,
      end_until = case when p_end_kind = 'until' then p_end_until end,
      missed_from = v_today,
      updated_at = now()
  where item_id = p_item_id
  returning * into v_rep;
  -- An occurrence still waiting to be marked stays the current one.
  if v_item.due_date is not null and v_item.due_date <= v_today then
    v_due := v_item.due_date;
  else
    v_due := public.repeat_first(v_rep, v_marked);
  end if;
  update public.items
  set time_mode = 'recurring',
      recurrence_rule = public.repeat_rule(v_rep.every, v_rep.unit),
      due_date = v_due,
      due_time = case when v_due is null then null else v_rep.at_time end
  where id = p_item_id;
end $$;

-- ---------- Marking occurrences -------------------------------------
-- Marks the current occurrence done or skipped and moves the item to the next one (none when
-- the series has ended). Returns the occurrence, so it can be taken back.
create function public.mark_occurrence(p_item_id uuid, p_status public.occurrence_status)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_rep    public.item_repeats%rowtype;
  v_item   public.items%rowtype;
  v_id     uuid;
  v_next   date;
begin
  if p_status not in ('done', 'skipped') then
    raise exception 'an occurrence is marked done or skipped';
  end if;
  v_rep := public.repeat_of(p_item_id);
  select * into v_item from public.items where id = p_item_id for update;
  if v_rep.item_id is null or v_item.time_mode <> 'recurring' or v_item.due_date is null
     or v_item.status <> 'open' then
    raise exception 'there is no occurrence to mark';
  end if;
  insert into public.occurrences (item_id, on_date, at_time, status, done_by)
  values (p_item_id, v_item.due_date, v_item.due_time, p_status, public.current_member_id())
  returning id into v_id;
  v_next := public.repeat_next(v_rep, v_item.due_date, false,
                               public.occurrence_count(p_item_id));
  update public.items
  set due_date = v_next,
      due_time = case when v_next is null then null else v_rep.at_time end
  where id = p_item_id;
  -- Marked late, more may have arrived meanwhile.
  perform public.roll_item(p_item_id);
  return v_id;
end $$;

-- Takes back marking an occurrence. The latest one becomes the current occurrence again;
-- an earlier one, whose time has gone by, is recorded as missed.
create function public.unmark_occurrence(p_occurrence_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_occ  public.occurrences%rowtype;
  v_item public.items%rowtype;
begin
  select * into v_occ from public.occurrences where id = p_occurrence_id;
  if v_occ.id is null or not public.can_see_item(v_occ.item_id) then
    raise exception 'occurrence not found';
  end if;
  if v_occ.status not in ('done', 'skipped') then
    raise exception 'only a marked occurrence can be taken back';
  end if;
  select * into v_item from public.items where id = v_occ.item_id for update;
  if v_item.status = 'open' and v_item.time_mode = 'recurring'
     and not exists (
       select 1 from public.occurrences o
       where o.item_id = v_occ.item_id and o.id <> v_occ.id and o.on_date >= v_occ.on_date
     )
     and (v_item.due_date is null or v_item.due_date > v_occ.on_date) then
    delete from public.occurrences where id = v_occ.id;
    update public.items set due_date = v_occ.on_date, due_time = v_occ.at_time
    where id = v_occ.item_id;
  else
    update public.occurrences set status = 'missed', done_by = null where id = v_occ.id;
  end if;
end $$;

-- Closes the item itself (not an occurrence): the only way a repeating item is marked done.
create function public.close_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  perform set_config('mishkan.close_series', 'on', true);
  update public.items set status = 'done' where id = p_item_id;
  perform set_config('mishkan.close_series', 'off', true);
end $$;

grant execute on function public.set_repeat(uuid, integer, public.repeat_unit, date, time,
  public.repeat_end, integer, date) to authenticated;
grant execute on function public.stop_repeat(uuid) to authenticated;
grant execute on function public.resume_repeat(uuid, public.repeat_end, integer, date)
  to authenticated;
grant execute on function public.mark_occurrence(uuid, public.occurrence_status)
  to authenticated;
grant execute on function public.unmark_occurrence(uuid) to authenticated;
grant execute on function public.close_item(uuid) to authenticated;

-- ---------- A device on the previous version ------------------------
-- There, marking a repeating task done either logs a completion and moves the date (a daily,
-- weekly or monthly rhythm), or sets the task done (any other rhythm). Both mark the current
-- occurrence instead; only close_item() closes a series that still has occurrences.
create function public.items_a_repeat_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_rep  public.item_repeats%rowtype;
  v_next date;
begin
  if new.status = 'done' and old.status = 'open' and old.time_mode = 'recurring'
     and old.due_date is not null
     and coalesce(current_setting('mishkan.close_series', true), '') <> 'on' then
    select * into v_rep from public.item_repeats where item_id = old.id;
    if v_rep.item_id is not null then
      insert into public.occurrences (item_id, on_date, at_time, status, done_by)
      values (old.id, old.due_date, old.due_time, 'done', public.current_member_id());
      v_next := public.repeat_next(v_rep, old.due_date, false,
                                   public.occurrence_count(old.id));
      new.status := 'open';
      new.due_date := v_next;
      new.due_time := case when v_next is null then null else v_rep.at_time end;
    end if;
  end if;
  return new;
end $$;

create trigger items_a_repeat_status
  before update of status on public.items
  for each row execute function public.items_a_repeat_status();

create function public.completions_to_occurrence() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.occurrences (item_id, on_date, at_time, status, done_by, done_at)
  select i.id, i.due_date, i.due_time, 'done', new.completed_by, new.completed_at
  from public.items i
  join public.item_repeats r on r.item_id = i.id
  where i.id = new.item_id and i.due_date is not null;
  return null;
end $$;

create trigger completions_to_occurrence
  after insert on public.completions
  for each row execute function public.completions_to_occurrence();

-- There, choosing "repeating" sets only the item's rule; its series is made from the rule.
create function public.items_repeat_from_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_unit  public.repeat_unit;
  v_every integer;
begin
  if new.kind <> 'task' or new.time_mode is distinct from 'recurring'
     or new.recurrence_rule is null or new.due_date is null
     or exists (select 1 from public.item_repeats r where r.item_id = new.id) then
    return null;
  end if;
  v_unit := case split_part(new.recurrence_rule, ';', 1)
              when 'FREQ=DAILY' then 'day'
              when 'FREQ=WEEKLY' then 'week'
              when 'FREQ=YEARLY' then 'year'
              else 'month'
            end;
  v_every := coalesce(nullif(substring(new.recurrence_rule from 'INTERVAL=([0-9]+)'), '')::integer, 1);
  insert into public.item_repeats (item_id, every, unit, starts_on, at_time)
  values (new.id, v_every, v_unit, new.due_date, new.due_time)
  on conflict (item_id) do nothing;
  return null;
end $$;

create trigger items_repeat_from_rule
  after insert or update of time_mode, recurrence_rule on public.items
  for each row execute function public.items_repeat_from_rule();

-- ---------- Every run of the reminders moves series on first --------
create or replace function public.claim_due_reminders()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.roll_occurrences();
  return query
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
  join public.push_subscriptions s on s.member_id = r.member_id;
end $$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;

-- ---------- 4. What exists moves over -------------------------------
-- Every repeating task: the same rhythm, counted from its current date, at its hour.
insert into public.item_repeats (item_id, every, unit, starts_on, at_time, missed_from)
select i.id, 1,
       case i.recurrence_rule
         when 'FREQ=DAILY' then 'day'
         when 'FREQ=WEEKLY' then 'week'
         else 'month'
       end::public.repeat_unit,
       coalesce(i.due_date, (i.created_at at time zone 'Asia/Jerusalem')::date),
       i.due_time,
       public.today_in_israel()
from public.items i
where i.recurrence_rule in ('FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY')
  and i.kind = 'task';

-- Each time one was done is a done occurrence, on the day it was done.
insert into public.occurrences (item_id, on_date, status, done_by, done_at)
select c.item_id, (c.completed_at at time zone 'Asia/Jerusalem')::date, 'done',
       c.completed_by, c.completed_at
from public.completions c
join public.item_repeats r on r.item_id = c.item_id;

-- One left late moves on to its latest occurrence, without recording the past as missed.
select public.roll_occurrences();
