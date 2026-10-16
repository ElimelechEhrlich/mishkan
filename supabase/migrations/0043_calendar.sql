-- =====================================================================
-- 0043 - Items in Google Calendar ("ביומן גוגל")
-- Each parent picks, item by item, what shows in their own Google Calendar.
-- The calendar subscribes once to a private link of the parent's (a secret
-- code in it); the "calendar" edge function reads the picked items through
-- calendar_events() with that code, and Google fetches it again from time to
-- time, so a change in the app reaches the calendar on its own.
-- A repeating item shows as its days (from two months back to a year ahead);
-- what was done shows with ✓. Only what the parent may see in the app shows.
-- The link can be replaced, and the old one stops working.
-- Run once in the Supabase SQL editor, after 0042.
-- =====================================================================

create table public.calendar_feeds (
  member_id    uuid primary key references public.members(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  token        text not null unique,
  created_at   timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

create policy calendar_feeds_own on public.calendar_feeds for select to authenticated
  using (member_id = public.current_member_id());

grant select on public.calendar_feeds to authenticated;

create table public.calendar_items (
  member_id    uuid not null default public.current_member_id()
               references public.members(id) on delete cascade,
  item_id      uuid not null references public.items(id) on delete cascade,
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (member_id, item_id)
);

alter table public.calendar_items enable row level security;

create policy calendar_items_own on public.calendar_items for all to authenticated
  using (member_id = public.current_member_id())
  with check (
    member_id = public.current_member_id()
    and household_id = public.current_household_id()
    and public.can_see_item(item_id)
  );

grant select, insert, delete on public.calendar_items to authenticated;

-- A new secret code: two random uuids, 244 random bits.
create function public.new_calendar_token() returns text
language sql volatile set search_path = '' as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- The parent's code, made the first time.
create function public.calendar_link() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid := public.current_member_id();
  v_token  text;
begin
  if v_member is null then
    raise exception 'not a member';
  end if;
  select token into v_token from public.calendar_feeds where member_id = v_member;
  if v_token is null then
    insert into public.calendar_feeds (member_id, household_id, token)
    values (v_member, public.current_household_id(), public.new_calendar_token())
    returning token into v_token;
  end if;
  return v_token;
end $$;

-- A new code in place of the old one, which stops working.
create function public.renew_calendar_link() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text;
begin
  perform public.calendar_link();
  update public.calendar_feeds set token = public.new_calendar_token(), created_at = now()
  where member_id = public.current_member_id()
  returning token into v_token;
  return v_token;
end $$;

-- The events of one parent's calendar, by the code of their link. An event with an hour has
-- `starts` (one hour long in the calendar); one without has only `on_date` (the whole day).
create function public.calendar_events(p_token text)
returns table (
  uid       text,
  item_id   uuid,
  title     text,
  notes     text,
  place     text,
  with_whom text,
  on_date   date,
  starts    timestamptz,
  done      boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_member    uuid;
  v_household uuid;
  v_today     date := public.today_in_israel();
begin
  select f.member_id, f.household_id into v_member, v_household
  from public.calendar_feeds f
  where p_token is not null and length(p_token) >= 32 and f.token = p_token;
  if v_member is null then
    return;
  end if;

  return query
  with picked as (
    select i.*
    from public.calendar_items c
    join public.items i on i.id = c.item_id
    left join public.entities ie on ie.id = i.entity_id
    left join public.domains d on d.id = i.domain_id
    left join public.entities de on de.id = d.entity_id
    where c.member_id = v_member
      and i.household_id = v_household
      -- What this parent may see, as can_see_item says for them.
      and (
        (i.domain_id is null and (ie.id is null or ie.kind <> 'personal' or ie.member_id = v_member))
        or (i.domain_id is not null and (de.kind <> 'personal' or de.member_id = v_member))
      )
  ),
  -- One time: its day, and its hour (an appointment's from when it starts).
  single as (
    select p.id, p.due_date as day,
           case when p.kind::text = 'appointment' and p.starts_at is not null
                then (p.starts_at at time zone 'Asia/Jerusalem')::time
                else p.due_time end as hour,
           p.status = 'done' as is_done
    from picked p
    where p.due_date is not null
      and not exists (select 1 from public.item_repeats r where r.item_id = p.id)
  ),
  -- A repeating item: its days in the window, each hour of a day on its own.
  series_days as (
    select p.id, day::date as day, r as rep, p.status, p.completed_at
    from picked p
    join public.item_repeats r on r.item_id = p.id
    cross join lateral generate_series(
      greatest(r.starts_on, v_today - 60), v_today + 365, interval '1 day') as day
    where r.from_kind = 'schedule'
      and public.repeat_is_day(r, day::date)
      and (r.end_kind <> 'until' or day::date <= r.end_until)
      and (r.stopped_on is null or day::date <= r.stopped_on)
      and (p.status = 'open' or day::date <= (p.completed_at at time zone 'Asia/Jerusalem')::date)
      -- The day the current one was planned for, when it was moved, is where it is now.
      and (r.planned_date is null or day::date <> r.planned_date
           or cardinality(public.repeat_times(r)) > 1)
  ),
  series_slots as (
    select s.id, s.day, t.hour
    from series_days s
    cross join lateral unnest(
      case when cardinality(public.repeat_times(s.rep)) = 0 then array[null::time]
           else public.repeat_times(s.rep) end) as t(hour)
  ),
  -- A series with a number of times ends after them, counted from its first day.
  counted as (
    select s.id, s.day, s.hour
    from series_slots s
    join public.item_repeats r on r.item_id = s.id
    where r.end_kind <> 'count'
       or (select count(*) from generate_series(r.starts_on, s.day - 1, interval '1 day') as g
           where public.repeat_is_day(r, g::date))
          * greatest(cardinality(public.repeat_times(r)), 1)
          + coalesce(array_position(public.repeat_times(r), s.hour), 1) <= r.end_count
  ),
  -- The current one where it is now (moved, or counted from when the last was done), and
  -- every one done before, wherever it fell.
  current_and_past as (
    select p.id, p.due_date as day,
           case when p.kind::text = 'appointment' and p.starts_at is not null
                then (p.starts_at at time zone 'Asia/Jerusalem')::time
                else p.due_time end as hour
    from picked p
    join public.item_repeats r on r.item_id = p.id
    where p.status = 'open' and p.due_date is not null
    union
    select o.item_id, o.on_date, o.at_time
    from public.occurrences o
    join picked p on p.id = o.item_id
    where o.status = 'done' and o.on_date >= v_today - 60
  ),
  repeating as (
    select x.id, x.day, x.hour,
           exists (select 1 from public.occurrences o
                   where o.item_id = x.id and o.on_date = x.day
                     and o.at_time is not distinct from x.hour and o.status = 'done') as is_done,
           exists (select 1 from public.occurrences o
                   where o.item_id = x.id and o.on_date = x.day
                     and o.at_time is not distinct from x.hour and o.status = 'skipped') as is_skipped
    from (select * from counted union select * from current_and_past) x
  ),
  events as (
    select s.id, s.day, s.hour, s.is_done, s.id::text as uid from single s
    union all
    select r.id, r.day, r.hour, r.is_done,
           r.id::text || '-' || to_char(r.day, 'YYYYMMDD')
             || coalesce('-' || to_char(r.hour, 'HH24MI'), '')
    from repeating r
    where not r.is_skipped
  )
  select e.uid, p.id, p.title, p.notes,
         coalesce(nullif(trim(p.place), ''), nullif(trim(p.meeting_url), '')), p.with_whom,
         e.day,
         case when e.hour is null then null
              else (e.day + e.hour) at time zone 'Asia/Jerusalem' end,
         e.is_done
  from events e
  join picked p on p.id = e.id
  order by e.day, e.hour nulls first;
end $$;

revoke all on function public.calendar_events(text) from public;
grant execute on function public.calendar_events(text) to anon, authenticated;
revoke all on function public.new_calendar_token() from public;
