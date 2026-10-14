-- =====================================================================
-- 0035 - Repeating, part two
-- 1. Several hours a day: each hour is an occurrence of its own (an
--    antibiotic at 08:00, 14:00 and 20:00 is three a day).
-- 2. Chosen days of the week (every Sunday and Wednesday, every other week).
-- 3. "Since it was last done": the next occurrence counts from the day the
--    current one was marked, not from a fixed calendar (a filter every three
--    months after it was changed). It has no missed occurrences.
-- 4. Moving one occurrence ("this time on Thursday"), keeping the rhythm.
-- 5. More kinds repeat: an appointment (a class every Tuesday at 16:00), a
--    tracker (with a choice whether entering a value closes the occurrence) and
--    a missing item (milk every week: back on the list when its day comes).
-- 6. A reminder of a repeating item rings for every occurrence, the ones still
--    ahead the same day included.
-- Nothing that exists changes meaning, and nothing is deleted. The functions
-- of 0034 keep working for a device on the previous version.
-- The send-reminders edge function needs no change.
-- Run once in the Supabase SQL editor, after 0034.
-- =====================================================================

alter table public.item_repeats
  -- The hours of each day, earliest first; empty for the whole day. at_time stays the first.
  add column times          time[] not null default '{}',
  -- For a weekly rhythm: the days of the week (0 = Sunday … 6 = Saturday); empty for the
  -- weekday of the first day.
  add column weekdays       smallint[] not null default '{}',
  add column from_kind      text not null default 'schedule'
                            check (from_kind in ('schedule', 'completion')),
  -- Set while the current occurrence was moved: the day and hour it was planned for, from which
  -- the rhythm goes on.
  add column planned_date   date,
  add column planned_time   time,
  -- A tracker: entering a value marks its current occurrence done.
  add column tracker_closes boolean not null default false;

update public.item_repeats set times = array[at_time] where at_time is not null;

-- ---------- Days and hours ------------------------------------------
create function public.now_in_israel() returns timestamp
language sql stable set search_path = '' as $$
  select now() at time zone 'Asia/Jerusalem'
$$;

-- The hours of a series, earliest first; empty for the whole day.
create function public.repeat_times(p_rep public.item_repeats) returns time[]
language sql immutable set search_path = '' as $$
  select coalesce(array(select t from unnest(
    case when cardinality(p_rep.times) > 0 then p_rep.times
         when p_rep.at_time is not null then array[p_rep.at_time]
         else '{}'::time[] end) as t order by t), '{}')
$$;

-- Whether a day is one of the series' days.
create function public.repeat_is_day(p_rep public.item_repeats, p_day date) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  v_week_start date;
begin
  if p_day < p_rep.starts_on then
    return false;
  end if;
  if p_rep.unit = 'week' and cardinality(p_rep.weekdays) > 0 then
    v_week_start := p_rep.starts_on - extract(dow from p_rep.starts_on)::integer;
    return extract(dow from p_day)::smallint = any (p_rep.weekdays)
           and ((p_day - v_week_start) / 7) % p_rep.every = 0;
  end if;
  return public.repeat_day_after(p_rep.starts_on, p_rep.every, p_rep.unit, p_day, true) = p_day;
end $$;

-- The first day of the series after a day.
create function public.repeat_day_next(p_rep public.item_repeats, p_day date) returns date
language plpgsql immutable set search_path = '' as $$
declare
  v_day date := p_day;
begin
  if p_rep.unit = 'week' and cardinality(p_rep.weekdays) > 0 then
    for i in 1 .. 7 * p_rep.every * 2 + 7 loop
      v_day := greatest(p_day + i, p_rep.starts_on);
      if public.repeat_is_day(p_rep, v_day) and v_day > p_day then
        return v_day;
      end if;
    end loop;
    return null;
  end if;
  return public.repeat_day_after(p_rep.starts_on, p_rep.every, p_rep.unit, p_day, false);
end $$;

-- Whether the series still has an occurrence on a day: within its end and not stopped, and
-- not past its number of times (`p_marked` used up so far).
create function public.repeat_allows(p_rep public.item_repeats, p_day date, p_marked integer)
returns boolean
language sql immutable set search_path = '' as $$
  select p_day is not null
     and (p_rep.end_kind <> 'count' or p_marked < p_rep.end_count)
     and (p_rep.end_kind <> 'until' or p_day <= p_rep.end_until)
     and (p_rep.stopped_on is null or p_day <= p_rep.stopped_on)
$$;

-- The next occurrence (day and hour, as a local time; a whole-day one at midnight) after a
-- moment, or at it when `p_inclusive`; null when the series has none.
create function public.repeat_next_slot(
  p_rep       public.item_repeats,
  p_after     timestamp,
  p_inclusive boolean,
  p_marked    integer
) returns timestamp
language plpgsql immutable set search_path = '' as $$
declare
  v_times time[] := public.repeat_times(p_rep);
  v_day   date := p_after::date;
  v_slot  timestamp;
  v_time  time;
begin
  if public.repeat_is_day(p_rep, v_day) then
    if cardinality(v_times) = 0 then
      if p_inclusive and p_after = v_day::timestamp then
        v_slot := v_day::timestamp;
      end if;
    else
      foreach v_time in array v_times loop
        if v_day + v_time > p_after or (p_inclusive and v_day + v_time = p_after) then
          v_slot := v_day + v_time;
          exit;
        end if;
      end loop;
    end if;
  end if;
  if v_slot is null then
    v_day := public.repeat_day_next(p_rep, v_day);
    if v_day is null then
      return null;
    end if;
    v_slot := v_day + coalesce(v_times[1], time '00:00');
  end if;
  if not public.repeat_allows(p_rep, v_slot::date, p_marked) then
    return null;
  end if;
  return v_slot;
end $$;

-- An item's current occurrence as a local time (a whole-day one at midnight).
create function public.item_slot(p_item public.items) returns timestamp
language sql stable set search_path = '' as $$
  select case
    when p_item.due_date is null then null
    when p_item.kind = 'appointment' and p_item.starts_at is not null
      then p_item.starts_at at time zone 'Asia/Jerusalem'
    else p_item.due_date + coalesce(p_item.due_time, time '00:00')
  end
$$;

-- Puts an item on an occurrence (or on none): its day and hour, and an appointment's start.
create function public.apply_slot(p_item_id uuid, p_slot timestamp) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_kind  public.item_kind;
  v_timed boolean;
begin
  select i.kind, cardinality(public.repeat_times(r)) > 0 into v_kind, v_timed
  from public.items i join public.item_repeats r on r.item_id = i.id
  where i.id = p_item_id;
  if p_slot is null then
    update public.items set due_date = null, due_time = null where id = p_item_id;
  elsif v_kind = 'appointment' then
    update public.items
    set starts_at = p_slot at time zone 'Asia/Jerusalem', due_date = p_slot::date, due_time = null
    where id = p_item_id;
  else
    update public.items
    set due_date = p_slot::date,
        due_time = case when v_timed then p_slot::time end
    where id = p_item_id;
  end if;
end $$;

-- The first occurrence from now that was not already marked.
create or replace function public.repeat_first_slot(p_rep public.item_repeats, p_marked integer)
returns timestamp
language plpgsql stable set search_path = '' as $$
declare
  v_from timestamp := greatest(public.now_in_israel(), p_rep.starts_on::timestamp);
  v_last timestamp;
begin
  if cardinality(public.repeat_times(p_rep)) = 0 then
    v_from := date_trunc('day', v_from);
  end if;
  select max(o.on_date + coalesce(o.at_time, time '00:00')) into v_last
  from public.occurrences o where o.item_id = p_rep.item_id;
  if v_last is not null and v_last >= v_from then
    return public.repeat_next_slot(p_rep, v_last, false, p_marked);
  end if;
  return public.repeat_next_slot(p_rep, v_from, true, p_marked);
end $$;

-- The occurrence after the current one is marked: by the rhythm from where the current one
-- was planned, or, counting from when it was done, a step from today.
create function public.repeat_after_mark(
  p_rep    public.item_repeats,
  p_item   public.items,
  p_marked integer
) returns timestamp
language plpgsql stable set search_path = '' as $$
declare
  v_times time[] := public.repeat_times(p_rep);
  v_today date := public.today_in_israel();
  v_day   date;
begin
  if p_rep.from_kind = 'completion' then
    v_day := public.repeat_day_after(v_today, p_rep.every, p_rep.unit, v_today, false);
    if not public.repeat_allows(p_rep, v_day, p_marked) then
      return null;
    end if;
    return v_day + coalesce(v_times[1], time '00:00');
  end if;
  return public.repeat_next_slot(
    p_rep,
    coalesce(p_rep.planned_date + coalesce(p_rep.planned_time, time '00:00'),
             public.item_slot(p_item)),
    false, p_marked);
end $$;

-- ---------- Marking -------------------------------------------------
-- Marks the current occurrence of an item, without asking who may: for the functions below.
create function public.mark_current(
  p_item_id uuid,
  p_status  public.occurrence_status,
  p_by      uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_rep  public.item_repeats%rowtype;
  v_item public.items%rowtype;
  v_slot timestamp;
  v_id   uuid;
begin
  select * into v_item from public.items where id = p_item_id for update;
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  v_slot := public.item_slot(v_item);
  if v_rep.item_id is null or v_item.time_mode <> 'recurring' or v_slot is null
     or v_item.status <> 'open' then
    raise exception 'there is no occurrence to mark';
  end if;
  insert into public.occurrences (item_id, on_date, at_time, status, done_by)
  values (p_item_id, v_slot::date,
          case when cardinality(public.repeat_times(v_rep)) > 0 then v_slot::time end,
          p_status, p_by)
  returning id into v_id;
  perform public.apply_slot(p_item_id,
    public.repeat_after_mark(v_rep, v_item, public.occurrence_count(p_item_id)));
  update public.item_repeats set planned_date = null, planned_time = null
  where item_id = p_item_id;
  perform public.roll_item(p_item_id);
  return v_id;
end $$;

revoke execute on function public.mark_current(uuid, public.occurrence_status, uuid)
  from public, anon, authenticated;

create or replace function public.mark_occurrence(p_item_id uuid, p_status public.occurrence_status)
returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('done', 'skipped') then
    raise exception 'an occurrence is marked done or skipped';
  end if;
  perform public.repeat_of(p_item_id);
  return public.mark_current(p_item_id, p_status, public.current_member_id());
end $$;

-- ---------- Moving on ----------------------------------------------
create or replace function public.roll_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.items%rowtype;
  v_rep    public.item_repeats%rowtype;
  v_now    timestamp := public.now_in_israel();
  v_timed  boolean;
  v_marked integer;
  v_slot   timestamp;
  v_base   timestamp;
  v_next   timestamp;
  v_moved  boolean := false;
  v_tries  integer := 0;
begin
  select * into v_item from public.items where id = p_item_id for update;
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  v_slot := public.item_slot(v_item);
  -- Counted from when it was done, an occurrence waits as long as it takes.
  if v_rep.item_id is null or v_rep.from_kind = 'completion' or v_item.status <> 'open'
     or v_item.time_mode <> 'recurring' or v_slot is null or v_slot > v_now then
    return;
  end if;
  v_timed := cardinality(public.repeat_times(v_rep)) > 0;
  v_base := coalesce(v_rep.planned_date + coalesce(v_rep.planned_time, time '00:00'), v_slot);
  v_marked := public.occurrence_count(p_item_id);
  loop
    v_next := public.repeat_next_slot(v_rep, v_base, false, v_marked + 1);
    exit when v_next is null or v_next > v_now or v_slot > v_now;
    if v_slot::date >= v_rep.missed_from and not exists (
         select 1 from public.occurrences o
         where o.item_id = p_item_id and o.on_date = v_slot::date
           and o.at_time is not distinct from (case when v_timed then v_slot::time end)) then
      insert into public.occurrences (item_id, on_date, at_time, status)
      values (p_item_id, v_slot::date, case when v_timed then v_slot::time end, 'missed');
      v_marked := v_marked + 1;
    end if;
    v_slot := v_next;
    v_base := v_next;
    v_moved := true;
    v_tries := v_tries + 1;
    exit when v_tries > 5000;
  end loop;
  if v_moved then
    perform public.apply_slot(p_item_id, v_slot);
    update public.item_repeats set planned_date = null, planned_time = null
    where item_id = p_item_id;
  end if;
end $$;

create or replace function public.roll_occurrences() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  for v_id in
    select i.id from public.items i
    join public.item_repeats r on r.item_id = i.id
    where i.status = 'open' and i.time_mode = 'recurring' and r.from_kind = 'schedule'
      and i.due_date <= public.today_in_israel()
  loop
    perform public.roll_item(v_id);
  end loop;
end $$;

-- ---------- Setting a series ----------------------------------------
-- Makes the item repeat with these settings, or changes them, from now on. What was marked
-- stays, and an occurrence already due and unmarked stays to be marked. A number of times can
-- not be set below what has already gone by.
create function public.save_repeat(
  p_item_id        uuid,
  p_every          integer,
  p_unit           public.repeat_unit,
  p_starts_on      date,
  p_times          time[],
  p_weekdays       smallint[],
  p_from_kind      text,
  p_end_kind       public.repeat_end,
  p_end_count      integer,
  p_end_until      date,
  p_tracker_closes boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.items%rowtype;
  v_old    public.item_repeats%rowtype;
  v_rep    public.item_repeats%rowtype;
  v_today  date := public.today_in_israel();
  v_times  time[] := coalesce(array(select distinct t from unnest(p_times) as t order by t), '{}');
  v_days   smallint[] := coalesce(array(select distinct d from unnest(p_weekdays) as d
                                         where d between 0 and 6 order by d), '{}');
  v_marked integer;
  v_keep   boolean;
  v_slot   timestamp;
begin
  v_old := public.repeat_of(p_item_id);
  select * into v_item from public.items where id = p_item_id for update;
  if v_item.kind not in ('task', 'appointment', 'tracker', 'missing_item') then
    raise exception 'this kind does not repeat';
  end if;
  if v_item.kind = 'appointment' and cardinality(v_times) <> 1 then
    raise exception 'a repeating appointment has one hour';
  end if;
  if p_from_kind = 'completion' and (cardinality(v_times) > 1 or cardinality(v_days) > 0) then
    raise exception 'counting from when it was done takes one hour a day and no weekdays';
  end if;
  if p_unit <> 'week' then
    v_days := '{}';
  end if;
  v_marked := public.occurrence_count(p_item_id);
  v_slot := public.item_slot(v_item);
  v_keep := v_item.time_mode = 'recurring' and v_old.item_id is not null
            and v_slot is not null and v_slot <= public.now_in_israel();
  if p_end_kind = 'count'
     and p_end_count < v_marked + (case when v_keep then 1 else 0 end) then
    raise exception 'the number of times can not be less than those already gone by';
  end if;

  insert into public.item_repeats as r
    (item_id, every, unit, starts_on, at_time, times, weekdays, from_kind, end_kind, end_count,
     end_until, tracker_closes, missed_from, updated_at)
  values (p_item_id, p_every, p_unit, p_starts_on, v_times[1], v_times, v_days, p_from_kind,
          p_end_kind,
          case when p_end_kind = 'count' then p_end_count end,
          case when p_end_kind = 'until' then p_end_until end,
          coalesce(p_tracker_closes, false), v_today, now())
  on conflict (item_id) do update
    set every = excluded.every, unit = excluded.unit, starts_on = excluded.starts_on,
        at_time = excluded.at_time, times = excluded.times, weekdays = excluded.weekdays,
        from_kind = excluded.from_kind, end_kind = excluded.end_kind,
        end_count = excluded.end_count, end_until = excluded.end_until,
        tracker_closes = excluded.tracker_closes,
        -- Changing the settings of a series that was stopped does not start it again.
        stopped_on = r.stopped_on,
        missed_from = greatest(r.missed_from, excluded.missed_from),
        updated_at = now()
  returning * into v_rep;

  update public.items
  set time_mode = 'recurring', recurrence_rule = public.repeat_rule(p_every, p_unit)
  where id = p_item_id;
  if not v_keep then
    perform public.apply_slot(p_item_id, public.repeat_first_slot(v_rep, v_marked));
    update public.item_repeats set planned_date = null, planned_time = null
    where item_id = p_item_id;
  end if;
end $$;

grant execute on function public.save_repeat(uuid, integer, public.repeat_unit, date, time[],
  smallint[], text, public.repeat_end, integer, date, boolean) to authenticated;

-- The settings of 0034, from a device on the previous version: one hour, no weekdays.
create or replace function public.set_repeat(
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
  v_old public.item_repeats%rowtype;
begin
  v_old := public.repeat_of(p_item_id);
  perform public.save_repeat(
    p_item_id, p_every, p_unit, p_starts_on,
    case when p_at_time is null then '{}'::time[] else array[p_at_time] end,
    case when v_old.item_id is null then '{}'::smallint[] else v_old.weekdays end,
    coalesce(v_old.from_kind, 'schedule'),
    p_end_kind, p_end_count, p_end_until, coalesce(v_old.tracker_closes, false));
end $$;

create or replace function public.stop_repeat(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep  public.item_repeats%rowtype;
  v_item public.items%rowtype;
begin
  v_rep := public.repeat_of(p_item_id);
  if v_rep.item_id is null then
    raise exception 'the item does not repeat';
  end if;
  update public.item_repeats set stopped_on = public.today_in_israel(), updated_at = now()
  where item_id = p_item_id;
  select * into v_item from public.items where id = p_item_id;
  -- One whose time has not come yet does not happen; one already due stays to be marked.
  if v_item.time_mode = 'recurring' and public.item_slot(v_item) > public.now_in_israel() then
    perform public.apply_slot(p_item_id, null);
  end if;
end $$;

create or replace function public.resume_repeat(
  p_item_id   uuid,
  p_end_kind  public.repeat_end,
  p_end_count integer,
  p_end_until date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep    public.item_repeats%rowtype;
  v_item   public.items%rowtype;
  v_marked integer;
  v_slot   timestamp;
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
      missed_from = public.today_in_israel(),
      planned_date = null,
      planned_time = null,
      updated_at = now()
  where item_id = p_item_id
  returning * into v_rep;
  update public.items
  set time_mode = 'recurring', recurrence_rule = public.repeat_rule(v_rep.every, v_rep.unit)
  where id = p_item_id;
  v_slot := public.item_slot(v_item);
  -- An occurrence still waiting to be marked stays the current one.
  if v_slot is null or v_slot > public.now_in_israel() then
    perform public.apply_slot(p_item_id, public.repeat_first_slot(v_rep, v_marked));
  end if;
end $$;

-- "This time on another day or hour": the rhythm goes on from where it was planned.
create function public.move_occurrence(p_item_id uuid, p_date date, p_time time)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep  public.item_repeats%rowtype;
  v_item public.items%rowtype;
  v_slot timestamp;
begin
  v_rep := public.repeat_of(p_item_id);
  select * into v_item from public.items where id = p_item_id for update;
  v_slot := public.item_slot(v_item);
  if v_rep.item_id is null or v_item.time_mode <> 'recurring' or v_slot is null then
    raise exception 'there is no occurrence to move';
  end if;
  if v_item.kind = 'appointment' and p_time is null then
    raise exception 'an appointment needs an hour';
  end if;
  update public.item_repeats
  set planned_date = coalesce(planned_date, v_slot::date),
      planned_time = case when planned_date is null then
                       case when cardinality(public.repeat_times(v_rep)) > 0 then v_slot::time end
                     else planned_time end
  where item_id = p_item_id;
  if v_item.kind = 'appointment' then
    update public.items
    set starts_at = (p_date + p_time) at time zone 'Asia/Jerusalem', due_date = p_date
    where id = p_item_id;
  else
    update public.items set due_date = p_date, due_time = p_time where id = p_item_id;
  end if;
end $$;

grant execute on function public.move_occurrence(uuid, date, time) to authenticated;

create or replace function public.unmark_occurrence(p_occurrence_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_occ  public.occurrences%rowtype;
  v_item public.items%rowtype;
  v_slot timestamp;
  v_at   timestamp;
begin
  select * into v_occ from public.occurrences where id = p_occurrence_id;
  if v_occ.id is null or not public.can_see_item(v_occ.item_id) then
    raise exception 'occurrence not found';
  end if;
  if v_occ.status not in ('done', 'skipped') then
    raise exception 'only a marked occurrence can be taken back';
  end if;
  select * into v_item from public.items where id = v_occ.item_id for update;
  v_slot := public.item_slot(v_item);
  v_at := v_occ.on_date + coalesce(v_occ.at_time, time '00:00');
  if v_item.status = 'open' and v_item.time_mode = 'recurring'
     and not exists (
       select 1 from public.occurrences o
       where o.item_id = v_occ.item_id and o.id <> v_occ.id
         and o.on_date + coalesce(o.at_time, time '00:00') >= v_at
     )
     and (v_slot is null or v_slot > v_at) then
    delete from public.occurrences where id = v_occ.id;
    perform public.apply_slot(v_occ.item_id, v_at);
  else
    update public.occurrences set status = 'missed', done_by = null where id = v_occ.id;
  end if;
end $$;

-- ---------- A device on the previous version ------------------------
create or replace function public.items_a_repeat_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_rep  public.item_repeats%rowtype;
  v_slot timestamp;
  v_next timestamp;
  v_kind public.item_kind;
begin
  if new.status = 'done' and old.status = 'open' and old.time_mode = 'recurring'
     and old.due_date is not null
     and coalesce(current_setting('mishkan.close_series', true), '') <> 'on' then
    select * into v_rep from public.item_repeats where item_id = old.id;
    if v_rep.item_id is not null then
      v_slot := public.item_slot(old);
      insert into public.occurrences (item_id, on_date, at_time, status, done_by)
      values (old.id, v_slot::date,
              case when cardinality(public.repeat_times(v_rep)) > 0 then v_slot::time end,
              'done', public.current_member_id());
      v_next := public.repeat_after_mark(v_rep, old, public.occurrence_count(old.id));
      v_kind := old.kind;
      new.status := 'open';
      new.due_date := v_next::date;
      new.due_time := case when v_next is null or v_kind = 'appointment'
                             or cardinality(public.repeat_times(v_rep)) = 0
                           then null else v_next::time end;
      if v_kind = 'appointment' and v_next is not null then
        new.starts_at := v_next at time zone 'Asia/Jerusalem';
      end if;
      -- Bought from a shopping run, it leaves the run and waits for its next day.
      if v_kind = 'missing_item' then
        new.run_id := null;
      end if;
      update public.item_repeats set planned_date = null, planned_time = null
      where item_id = old.id;
    end if;
  end if;
  return new;
end $$;

-- ---------- Appointments keep repeating -----------------------------
create or replace function public.items_appointment_day() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind::text = 'appointment' and new.starts_at is not null then
    new.due_date := (new.starts_at at time zone 'Asia/Jerusalem')::date;
    new.time_mode := case when new.time_mode = 'recurring' then 'recurring'
                          else 'scheduled' end::public.item_time_mode;
  end if;
  return new;
end $$;

-- ---------- A tracker: entering a value closes the occurrence --------
create function public.tracker_entries_close_occurrence() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.items%rowtype;
begin
  select * into v_item from public.items where id = new.item_id;
  if v_item.kind = 'tracker' and v_item.status = 'open' and v_item.time_mode = 'recurring'
     and v_item.due_date is not null and v_item.due_date <= new.on_date
     and exists (select 1 from public.item_repeats r
                 where r.item_id = new.item_id and r.tracker_closes) then
    perform public.mark_current(new.item_id, 'done', public.current_member_id());
  end if;
  return null;
end $$;

create trigger tracker_entries_close_occurrence
  after insert on public.tracker_entries
  for each row execute function public.tracker_entries_close_occurrence();

-- ---------- Reminders for every occurrence --------------------------
-- A relative reminder of a repeating item rings before each occurrence in turn: the first ring
-- still ahead, from the current occurrence on (the next ones the same day included).
create or replace function public.item_reminders_ring() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.items%rowtype;
  v_rep    public.item_repeats%rowtype;
  v_after  timestamptz;
  v_slot   timestamp;
  v_ring   timestamptz;
  v_marked integer;
begin
  if new.rule = 'repeat' then
    if tg_op = 'INSERT'
       or (new.rule, new.at, new.every, new.unit, new.until)
          is distinct from (old.rule, old.at, old.every, old.unit, old.until) then
      new.sent_for := null;
      new.due_at := public.reminder_next_ring(
        new.at, new.every, new.unit, now() - interval '1 minute', new.until);
    elsif new.sent_for is distinct from old.sent_for then
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
  select * into v_rep from public.item_repeats where item_id = new.item_id;
  if v_item.time_mode = 'recurring' and v_rep.item_id is not null then
    v_after := case
      when tg_op = 'INSERT'
           or (new.rule, new.minutes_before, new.days_before, new.at_time)
              is distinct from (old.rule, old.minutes_before, old.days_before, old.at_time)
        then now() - interval '1 minute'
      else greatest(coalesce(new.sent_for, now() - interval '1 minute'),
                    now() - interval '1 minute')
    end;
    v_slot := public.item_slot(v_item);
    v_marked := public.occurrence_count(new.item_id);
    new.due_at := null;
    for i in 1 .. 200 loop
      exit when v_slot is null;
      v_ring := case new.rule
        when 'before' then
          case when v_item.kind = 'appointment' or cardinality(public.repeat_times(v_rep)) > 0
               then (v_slot at time zone 'Asia/Jerusalem') - make_interval(mins => new.minutes_before)
          end
        else ((v_slot::date - new.days_before) + new.at_time) at time zone 'Asia/Jerusalem'
      end;
      exit when v_ring is null;
      if v_ring > v_after then
        new.due_at := v_ring;
        exit;
      end if;
      v_slot := public.repeat_next_slot(v_rep, v_slot, false, v_marked + i);
    end loop;
    return new;
  end if;

  new.due_at := public.reminder_relative_ring(
    new.rule, new.minutes_before, new.days_before, new.at_time, v_item);
  if (tg_op = 'INSERT' or new.due_at is distinct from old.due_at)
     and new.due_at <= now() then
    new.sent_for := new.due_at;
  end if;
  return new;
end $$;

-- A tracker or a missing item that repeats counts its reminders from its occurrences too.
create or replace function public.reminder_relative_ring(
  p_rule           public.reminder_rule,
  p_minutes_before integer,
  p_days_before    integer,
  p_at_time        time,
  p_item           public.items
) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  v_dated boolean := (p_item.kind in ('task', 'goal')
                      and p_item.time_mode in ('scheduled', 'recurring')
                      or p_item.kind in ('tracker', 'missing_item')
                         and p_item.time_mode = 'recurring')
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

-- Every reminder of a repeating item takes the new reckoning.
update public.item_reminders r
set item_id = r.item_id
from public.items i
where i.id = r.item_id and i.time_mode = 'recurring' and r.rule in ('before', 'day');

-- ---------- A new repeating appointment -----------------------------
-- One appointment that repeats (every week, every two weeks or every month, a number of
-- times), instead of separate ones; each time can be moved or skipped on its own.
create function public.create_repeating_appointment(
  p_title       text,
  p_domain_id   uuid,
  p_starts      timestamptz,
  p_place_kind  public.meeting_place,
  p_place       text,
  p_meeting_url text,
  p_with_whom   text,
  p_entity_id   uuid,
  p_every       integer,
  p_unit        public.repeat_unit,
  p_count       integer
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id    uuid;
  v_local timestamp := p_starts at time zone 'Asia/Jerusalem';
begin
  insert into public.items
    (title, kind, domain_id, entity_id, time_mode, due_date, starts_at,
     place_kind, place, meeting_url, with_whom)
  values
    (p_title, 'appointment', p_domain_id, p_entity_id, 'scheduled', v_local::date, p_starts,
     p_place_kind, nullif(trim(p_place), ''), nullif(trim(p_meeting_url), ''),
     nullif(trim(p_with_whom), ''))
  returning id into v_id;
  perform public.save_repeat(
    v_id, p_every, p_unit, v_local::date, array[v_local::time], '{}', 'schedule',
    case when p_count is null then 'never' else 'count' end::public.repeat_end,
    p_count, null, false);
  return v_id;
end $$;

grant execute on function public.create_repeating_appointment(
  text, uuid, timestamptz, public.meeting_place, text, text, text, uuid, integer,
  public.repeat_unit, integer
) to authenticated;
