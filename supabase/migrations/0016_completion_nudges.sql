-- =====================================================================
-- 0016 - A nudge to complete what is waiting
-- Twice a day, at 13:00 and at 20:30 Israel time, a parent whose "needs
-- completion" list is not empty gets one notification on their devices,
-- saying how many items wait there. The send-reminders edge function, which
-- a cron job already calls every few minutes, sends it. A parent with nothing
-- waiting gets nothing.
-- Run once in the Supabase SQL editor, after 0015.
-- =====================================================================

-- When the parent was last nudged, so each time of day is sent once.
alter table public.members add column completion_nudged_at timestamptz;

-- For the edge function only: the parents due a nudge now, marked as nudged,
-- with how many items wait for them, one row per device. The time of day
-- passed most recently today counts, for up to two hours after it, so a late
-- run still sends it and an old one is not sent at night.
create function public.claim_completion_nudges()
returns table (member_id uuid, waiting integer, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with now_here as (
    select (now() at time zone 'Asia/Jerusalem') as local_now
  ),
  slot as (
    select case
             when local_now::time >= time '20:30' then (local_now::date + time '20:30')
             when local_now::time >= time '13:00' then (local_now::date + time '13:00')
           end at time zone 'Asia/Jerusalem' as at
    from now_here
  ),
  waiting as (
    select i.review_by as member_id, count(*)::integer as waiting
    from public.items i
    where i.status = 'open'
      and i.hidden = false
      and not i.is_complete
      and i.review_by is not null
    group by i.review_by
  ),
  due as (
    update public.members m
    set completion_nudged_at = now()
    from slot, waiting w
    where slot.at is not null
      and now() < slot.at + interval '2 hours'
      and w.member_id = m.id
      and m.user_id is not null
      and (m.completion_nudged_at is null or m.completion_nudged_at < slot.at)
      and exists (select 1 from public.push_subscriptions s where s.member_id = m.id)
    returning m.id, w.waiting
  )
  select d.id, d.waiting, s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscriptions s on s.member_id = d.id
$$;

revoke execute on function public.claim_completion_nudges() from public, anon, authenticated;
grant execute on function public.claim_completion_nudges() to service_role;
