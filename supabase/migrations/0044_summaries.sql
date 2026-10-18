-- =====================================================================
-- 0044 - Morning and evening summaries ("סיכום בוקר", "סיכום ערב")
-- The morning look at today (until now at 08:00 for everyone, with counts only)
-- comes at the hour each parent picks, and names the first things of the day
-- by their hour. An evening summary joins it: what is set for tomorrow, and
-- how much is still open from today. Each parent picks the two hours in the
-- settings, or turns either off (no hour). A day with nothing sends nothing.
-- What counts is what the today screen lists, as before: agenda_rows() holds
-- it now, for any day, so both summaries count the same way.
-- Also: a goal made urgent makes urgent its steps that have no time of their own (a step
-- with a date or an hour keeps it), and new ones added while it is urgent; when the goal
-- stops being urgent, the steps it made urgent go back to no time. A step changed by hand
-- is its own from then on.
-- Run once in the Supabase SQL editor, after 0043.
-- =====================================================================

alter table public.members
  add column morning_at time default '08:00',
  add column evening_at time default '21:00',
  add column evening_nudged_at timestamptz;

comment on column public.members.morning_at is 'When the morning summary comes; null turns it off.';
comment on column public.members.evening_at is 'When the evening summary comes; null turns it off.';

-- What the today screen lists for a day, of every household: each row with its title, its
-- hour, and whether it is late, urgent, or for that day. Steps inside an open goal or
-- issue go with it.
create function public.agenda_rows(p_day date)
returns table (household_id uuid, domain_id uuid, title text, hour time,
               late boolean, urgent boolean, on_day boolean)
language sql stable security definer set search_path = '' as $$
  with rows as (
    select i.id, i.household_id, i.kind, i.domain_id, i.title,
           case when i.kind = 'appointment' and i.starts_at is not null
                then (i.starts_at at time zone 'Asia/Jerusalem')::time
                when i.kind in ('goal', 'issue') then null
                else i.due_time end as hour,
           case when i.kind = 'issue' then null else i.due_date end as own_due,
           (i.kind <> 'issue' and i.time_mode = 'urgent') as own_urgent
    from public.items i
    where i.status = 'open'
      and i.hidden = false
      and i.is_complete
      -- An appointment whose day passed is asked about, not counted as late.
      and not (i.kind = 'appointment'
               and i.due_date < (now() at time zone 'Asia/Jerusalem')::date)
      and (i.kind in ('issue', 'appointment')
           or (i.kind in ('task', 'goal')
               and i.time_mode not in ('waiting', 'someday')))
      and not exists (
        select 1 from public.items p
        where p.id = i.parent_id
          and p.kind in ('goal', 'issue')
          and p.status = 'open'
          and p.hidden = false
          and p.is_complete
          -- A goal that waits or is on the shelf is not counted, so its steps count alone.
          and (p.kind = 'issue' or p.time_mode not in ('waiting', 'someday'))
      )
  ),
  dated as (
    select r.*,
           -- A goal goes by its earliest open step, or by its target date when no step
           -- has a date; anything else by its own date and its steps'.
           case when r.kind = 'goal' then coalesce(st.first_due, r.own_due)
                else least(r.own_due, st.first_due) end as due,
           -- A goal's own date is its target: once past, the goal is late.
           (r.kind = 'goal' and r.own_due is not null) as has_target,
           -- Urgent with no date, the item's own or an open step's.
           (r.own_urgent or exists (
              select 1 from public.items s
              where r.kind in ('goal', 'issue')
                and s.parent_id = r.id
                and s.kind = 'task'
                and s.status = 'open'
                and s.time_mode = 'urgent')) as is_urgent
    from rows r
    cross join lateral (
      select min(s.due_date) as first_due from public.items s
      where r.kind in ('goal', 'issue')
        and s.parent_id = r.id
        and s.kind = 'task'
        and s.status = 'open'
    ) st
  ),
  judged as (
    select d.*,
           -- coalesce: an item with no date is not late.
           (coalesce(d.due < p_day, false)
            or coalesce(d.has_target and d.own_due < p_day, false)) as is_late,
           -- On its target day a goal is for that day, even when its steps are dated later.
           coalesce(d.has_target and d.own_due = p_day, false) as target_day
    from dated d
  )
  select j.household_id, j.domain_id, j.title, j.hour,
         j.is_late, j.is_urgent and not j.is_late,
         not j.is_late and (j.due = p_day or j.target_day)
  from judged j
  where j.is_late or j.is_urgent or j.due = p_day or j.target_day
$$;

revoke all on function public.agenda_rows(date) from public, anon, authenticated;

-- What each parent with a phone sees of a day: the rows of their household, but not the
-- other parent's own entity.
create function public.member_agenda(p_day date)
returns table (member_id uuid, title text, hour time,
               late boolean, urgent boolean, on_day boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, a.title, a.hour, a.late, a.urgent, a.on_day
  from public.agenda_rows(p_day) a
  join public.members m on m.household_id = a.household_id and m.user_id is not null
  left join public.domains dm on dm.id = a.domain_id
  left join public.entities e on e.id = dm.entity_id
  where e.kind is distinct from 'personal' or e.member_id = m.id
$$;

revoke all on function public.member_agenda(date) from public, anon, authenticated;

-- The morning summary: late, and for today (urgent counts as today), with the first
-- three of today by hour. Once a day, from the parent's hour and for three hours after.
drop function public.claim_today_nudges();
create function public.claim_today_nudges()
returns table (member_id uuid, overdue integer, due_today integer, titles text[],
               endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with here as (
    select (now() at time zone 'Asia/Jerusalem') as local_now,
           (now() at time zone 'Asia/Jerusalem')::date as today
  ),
  counted as (
    select a.member_id,
           count(*) filter (where a.late)::integer as overdue,
           count(*) filter (where not a.late)::integer as due_today,
           (array_agg(
              case when a.hour is null then a.title
                   else to_char(a.hour, 'HH24:MI') || ' ' || a.title end
              order by a.hour nulls last, a.title
            ) filter (where not a.late))[1:3] as titles
    from here, public.member_agenda(here.today) a
    group by a.member_id
  ),
  due as (
    update public.members m
    set today_nudged_at = now()
    from here, counted c
    where c.member_id = m.id
      and m.morning_at is not null
      and here.local_now >= here.today + m.morning_at
      and here.local_now < here.today + m.morning_at + interval '3 hours'
      and (m.today_nudged_at is null
           or m.today_nudged_at < (here.today + m.morning_at) at time zone 'Asia/Jerusalem')
      and exists (select 1 from public.push_subscriptions s where s.member_id = m.id)
    returning m.id, c.overdue, c.due_today, c.titles
  )
  select d.id, d.overdue, d.due_today, coalesce(d.titles, '{}'), s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscriptions s on s.member_id = d.id
$$;

revoke execute on function public.claim_today_nudges() from public, anon, authenticated;
grant execute on function public.claim_today_nudges() to service_role;

-- The evening summary: what is set for tomorrow (its first three by hour), and how much
-- of today is still open (late, today's and urgent). Once a day, from the parent's hour.
create function public.claim_evening_summaries()
returns table (member_id uuid, tomorrow integer, titles text[], still_open integer,
               endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with here as (
    select (now() at time zone 'Asia/Jerusalem') as local_now,
           (now() at time zone 'Asia/Jerusalem')::date as today
  ),
  ahead as (
    select a.member_id,
           count(*)::integer as tomorrow,
           (array_agg(
              case when a.hour is null then a.title
                   else to_char(a.hour, 'HH24:MI') || ' ' || a.title end
              order by a.hour nulls last, a.title
            ))[1:3] as titles
    from here, public.member_agenda(here.today + 1) a
    where a.on_day
    group by a.member_id
  ),
  left_open as (
    select a.member_id, count(*)::integer as still_open
    from here, public.member_agenda(here.today) a
    group by a.member_id
  ),
  counted as (
    select coalesce(t.member_id, o.member_id) as member_id,
           coalesce(t.tomorrow, 0) as tomorrow,
           coalesce(t.titles, '{}') as titles,
           coalesce(o.still_open, 0) as still_open
    from ahead t
    full join left_open o on o.member_id = t.member_id
  ),
  due as (
    update public.members m
    set evening_nudged_at = now()
    from here, counted c
    where c.member_id = m.id
      and m.evening_at is not null
      and here.local_now >= here.today + m.evening_at
      and here.local_now < here.today + m.evening_at + interval '2 hours'
      and (m.evening_nudged_at is null
           or m.evening_nudged_at < (here.today + m.evening_at) at time zone 'Asia/Jerusalem')
      and exists (select 1 from public.push_subscriptions s where s.member_id = m.id)
    returning m.id, c.tomorrow, c.titles, c.still_open
  )
  select d.id, d.tomorrow, d.titles, d.still_open, s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscriptions s on s.member_id = d.id
$$;

revoke execute on function public.claim_evening_summaries() from public, anon, authenticated;
grant execute on function public.claim_evening_summaries() to service_role;

-- ---------- Steps follow an urgent goal -----------------------------
alter table public.items add column urgent_from_parent boolean not null default false;

comment on column public.items.urgent_from_parent is
  'A step made urgent by its goal, which goes back to no time when the goal stops being urgent.';

create function public.items_goal_urgency() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.time_mode = 'urgent' and old.time_mode is distinct from 'urgent' then
    update public.items
    set time_mode = 'urgent', urgent_from_parent = true
    where parent_id = new.id
      and kind = 'task'
      and status = 'open'
      and due_date is null
      and (time_mode is null or time_mode = 'anytime');
  elsif old.time_mode = 'urgent' and new.time_mode is distinct from 'urgent' then
    update public.items
    set time_mode = 'anytime', urgent_from_parent = false
    where parent_id = new.id and urgent_from_parent and time_mode = 'urgent';
  end if;
  return null;
end $$;

create trigger items_goal_urgency
  after update of time_mode on public.items
  for each row when (new.kind = 'goal')
  execute function public.items_goal_urgency();

-- A new step of an urgent goal, with no time of its own, is urgent too; a step whose time is
-- changed by hand is its own from then on.
create function public.items_step_urgency() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null
       and new.kind = 'task'
       and new.due_date is null
       and (new.time_mode is null or new.time_mode = 'anytime')
       and exists (select 1 from public.items g
                   where g.id = new.parent_id and g.kind = 'goal' and g.time_mode = 'urgent') then
      new.time_mode := 'urgent';
      new.urgent_from_parent := true;
    end if;
  elsif pg_trigger_depth() = 1
        and (new.time_mode is distinct from old.time_mode
             or new.due_date is distinct from old.due_date) then
    new.urgent_from_parent := false;
  end if;
  return new;
end $$;

create trigger items_step_urgency
  before insert or update of time_mode, due_date on public.items
  for each row execute function public.items_step_urgency();
