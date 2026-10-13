-- =====================================================================
-- 0026 - What is urgent counts in the morning look
-- An item marked urgent ("דחוף") has no date, and the today screen shows it in
-- a group of its own. The morning notification counts it with what is for
-- today, so its wording and the edge function stay as they are. A goal or an
-- issue counts when one of its open steps is urgent. Something already late
-- stays late. And a step of a goal that waits or is on the shelf now counts on
-- its own, as on the screen.
-- The function is the one from 0017 with that added; nothing else changes.
-- Run once in the Supabase SQL editor, after 0025.
-- =====================================================================

create or replace function public.claim_today_nudges()
returns table (member_id uuid, overdue integer, due_today integer,
               endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with now_here as (
    select (now() at time zone 'Asia/Jerusalem') as local_now
  ),
  slot as (
    select (local_now::date + time '08:00') at time zone 'Asia/Jerusalem' as at,
           local_now::date as today
    from now_here
    where local_now::time >= time '08:00'
  ),
  -- What the today screen lists: steps inside an open goal or issue go with it.
  rows as (
    select i.id, i.household_id, i.kind, i.domain_id,
           case when i.kind = 'issue' then null else i.due_date end as own_due,
           (i.kind <> 'issue' and i.time_mode = 'urgent') as own_urgent
    from public.items i
    where i.status = 'open'
      and i.hidden = false
      and i.is_complete
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
           least(r.own_due,
                 (select min(s.due_date) from public.items s
                  where r.kind in ('goal', 'issue')
                    and s.parent_id = r.id
                    and s.kind = 'task'
                    and s.status = 'open')) as due,
           -- Urgent with no date counts as today, the item's own or an open step's.
           (r.own_urgent or exists (
              select 1 from public.items s
              where r.kind in ('goal', 'issue')
                and s.parent_id = r.id
                and s.kind = 'task'
                and s.status = 'open'
                and s.time_mode = 'urgent')) as urgent
    from rows r
  ),
  counted as (
    select m.id as member_id,
           count(*) filter (where d.due < slot.today)::integer as overdue,
           -- What is urgent and not late counts as for today.
           count(*) filter (where d.due = slot.today
                              or (d.urgent and (d.due is null or d.due > slot.today)))::integer
             as due_today
    from slot
    join dated d on d.due <= slot.today or d.urgent
    join public.members m on m.household_id = d.household_id and m.user_id is not null
    left join public.domains dm on dm.id = d.domain_id
    left join public.entities e on e.id = dm.entity_id
    where e.kind is distinct from 'personal' or e.member_id = m.id
    group by m.id
  ),
  due as (
    update public.members m
    set today_nudged_at = now()
    from slot, counted c
    where c.member_id = m.id
      and now() < slot.at + interval '3 hours'
      and (m.today_nudged_at is null or m.today_nudged_at < slot.at)
      and exists (select 1 from public.push_subscriptions s where s.member_id = m.id)
    returning m.id, c.overdue, c.due_today
  )
  select d.id, d.overdue, d.due_today, s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscriptions s on s.member_id = d.id
$$;

revoke execute on function public.claim_today_nudges() from public, anon, authenticated;
grant execute on function public.claim_today_nudges() to service_role;
