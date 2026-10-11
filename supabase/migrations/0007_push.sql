-- =====================================================================
-- 0007 - Reminders on the phone (web push)
-- Each device that turns notifications on keeps a push subscription for the
-- parent using it. An item with a reminder time (remind_at) is sent once to
-- every parent who can see it, by the send-reminders edge function, which a
-- cron job calls every few minutes. Birthday and anniversary reminders ring
-- at 09:00 Israel time on their day.
-- Run once in the Supabase SQL editor, after 0006.
-- =====================================================================

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);
create index push_subscriptions_member_idx on public.push_subscriptions (member_id);

alter table public.push_subscriptions enable row level security;

-- A parent sees and removes only the devices of their own.
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

grant select, delete on public.push_subscriptions to authenticated;

-- Saves this device for the parent signed in on it; a device that moved to
-- another parent's account moves with it.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid := public.current_member_id();
begin
  if v_member is null then
    raise exception 'not a member';
  end if;
  insert into public.push_subscriptions (household_id, member_id, endpoint, p256dh, auth)
  values (public.current_household_id(), v_member, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set household_id = excluded.household_id,
        member_id    = excluded.member_id,
        p256dh       = excluded.p256dh,
        auth         = excluded.auth;
end $$;

grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------- Reminder times -------------------------------------------
alter table public.items add column reminder_sent_at timestamptz;

-- A new reminder time rings again.
create function public.items_reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.remind_at is distinct from old.remind_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;

create trigger items_reset_reminder
  before update of remind_at on public.items
  for each row execute function public.items_reset_reminder();

create index items_due_reminders_idx on public.items (remind_at)
  where reminder_sent_at is null and status = 'open';

-- Automatic reminders ring at nine in the morning of their day.
create or replace function public.sync_auto_reminder(
  p_prefix    text,
  p_key       text,
  p_title     text,
  p_domain_id uuid,
  p_due       date
) returns void
language plpgsql set search_path = '' as $$
begin
  if left(p_key, length(p_prefix)) <> p_prefix then
    raise exception 'the key must start with the prefix';
  end if;

  delete from public.items
  where household_id = public.current_household_id()
    and auto_key like p_prefix || '%'
    and auto_key <> p_key
    and status = 'open';

  insert into public.items (title, kind, domain_id, time_mode, due_date, remind_at, auto_key)
  values (p_title, 'task', p_domain_id, 'scheduled', p_due,
          (p_due + time '09:00') at time zone 'Asia/Jerusalem', p_key)
  on conflict (household_id, auto_key) do update
    set title     = excluded.title,
        domain_id = coalesce(public.items.domain_id, excluded.domain_id)
    where public.items.status = 'open'
      and (public.items.title <> excluded.title or public.items.domain_id is null);
end $$;

update public.items
set remind_at = (due_date + time '09:00') at time zone 'Asia/Jerusalem'
where auto_key is not null and status = 'open' and remind_at is null and due_date is not null;

-- ---------- Sending ---------------------------------------------------
-- For the edge function only: takes the reminders that are due, marks them sent,
-- and returns one row per device that should get each. A parent gets a reminder
-- when they can see the item: everyone for shared entities, the owner for a
-- personal entity, and for an item without a domain, the parent completing it.
create function public.claim_due_reminders()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with due as (
    update public.items i
    set reminder_sent_at = now()
    where i.remind_at <= now()
      and i.reminder_sent_at is null
      and i.status = 'open'
      and i.hidden = false
    returning i.id, i.title, i.household_id, i.domain_id, i.review_by
  ),
  recipients as (
    select d.id, d.title, m.id as member_id
    from due d
    join public.members m on m.household_id = d.household_id and m.user_id is not null
    left join public.domains dm on dm.id = d.domain_id
    left join public.entities e on e.id = dm.entity_id
    where (d.domain_id is null and m.id = d.review_by)
       or (d.domain_id is not null and (e.kind <> 'personal' or e.member_id = m.id))
  )
  select r.id, r.title, s.endpoint, s.p256dh, s.auth
  from recipients r
  join public.push_subscriptions s on s.member_id = r.member_id
$$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
