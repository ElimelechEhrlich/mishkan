-- =====================================================================
-- 0018 - Remind me again, for me alone
-- "Remind me again" on a reminder's notification puts it off for the parent
-- who tapped it, and only for them: the item's own reminder and whom it is for
-- stay as they were. Each parent keeps at most one such reminder per item; a
-- new choice replaces it. The send-reminders edge function sends them.
-- Run once in the Supabase SQL editor, after 0017.
-- =====================================================================

create table public.reminder_snoozes (
  item_id    uuid not null references public.items(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  remind_at  timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);

alter table public.reminder_snoozes enable row level security;

-- A parent sees and sets only their own, and only on items they can see.
create policy reminder_snoozes_own on public.reminder_snoozes for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id() and public.can_see_item(item_id));

grant select, insert, update, delete on public.reminder_snoozes to authenticated;

-- For the edge function only: takes the put-off reminders that are due, and
-- returns one row per device of the parent who put each off. A reminder of an
-- item that was done or hidden meanwhile is dropped.
create function public.claim_due_snoozes()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with due as (
    delete from public.reminder_snoozes z
    where z.remind_at <= now()
    returning z.item_id, z.member_id
  )
  select i.id, i.title, s.endpoint, s.p256dh, s.auth
  from due d
  join public.items i on i.id = d.item_id and i.status = 'open' and i.hidden = false
  join public.push_subscriptions s on s.member_id = d.member_id
$$;

revoke execute on function public.claim_due_snoozes() from public, anon, authenticated;
grant execute on function public.claim_due_snoozes() to service_role;
