-- =====================================================================
-- 0008 - Choosing who gets a reminder
-- A reminder goes to everyone who can see the item, unless it names the
-- parents it is for (remind_member_ids). A parent can also see which parents
-- have notifications on, so the app can say when a reminder would reach no one.
-- Run once in the Supabase SQL editor, after 0007.
-- =====================================================================

alter table public.items add column remind_member_ids uuid[];

-- Choosing other people rings the reminder again.
create or replace function public.items_reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.remind_at is distinct from old.remind_at
     or new.remind_member_ids is distinct from old.remind_member_ids then
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;

drop trigger items_reset_reminder on public.items;
create trigger items_reset_reminder
  before update of remind_at, remind_member_ids on public.items
  for each row execute function public.items_reset_reminder();

-- The parents of the household who have notifications on in at least one device.
create function public.members_with_push() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct s.member_id
  from public.push_subscriptions s
  where s.household_id = public.current_household_id()
$$;

grant execute on function public.members_with_push() to authenticated;

create or replace function public.claim_due_reminders()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with due as (
    update public.items i
    set reminder_sent_at = now()
    where i.remind_at <= now()
      and i.reminder_sent_at is null
      and i.status = 'open'
      and i.hidden = false
    returning i.id, i.title, i.household_id, i.domain_id, i.review_by, i.remind_member_ids
  ),
  recipients as (
    select d.id, d.title, m.id as member_id
    from due d
    join public.members m on m.household_id = d.household_id and m.user_id is not null
    left join public.domains dm on dm.id = d.domain_id
    left join public.entities e on e.id = dm.entity_id
    where ((d.domain_id is null and m.id = d.review_by)
        or (d.domain_id is not null and (e.kind <> 'personal' or e.member_id = m.id)))
      and (d.remind_member_ids is null or m.id = any (d.remind_member_ids))
  )
  select r.id, r.title, s.endpoint, s.p256dh, s.auth
  from recipients r
  join public.push_subscriptions s on s.member_id = r.member_id
$$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
