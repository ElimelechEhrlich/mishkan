-- =====================================================================
-- 0009 - Who gets the automatic reminders
-- The household chooses which parents get the reminders of Hebrew birthdays
-- and the wedding anniversary (null = everyone who can see them). The choice
-- applies to new automatic reminders and to open ones not sent yet.
-- Run once in the Supabase SQL editor, after 0008.
-- =====================================================================

alter table public.households add column auto_remind_member_ids uuid[];

create function public.set_auto_reminder_recipients(p_member_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
begin
  if v_household is null then
    raise exception 'not a member';
  end if;
  if p_member_ids is not null and exists (
    select 1 from unnest(p_member_ids) as chosen(id)
    where not exists (
      select 1 from public.members m where m.id = chosen.id and m.household_id = v_household
    )
  ) then
    raise exception 'member not in household';
  end if;

  update public.households
  set auto_remind_member_ids = nullif(p_member_ids, '{}')
  where id = v_household;

  update public.items
  set remind_member_ids = nullif(p_member_ids, '{}')
  where household_id = v_household
    and auto_key is not null
    and status = 'open'
    and reminder_sent_at is null;
end $$;

grant execute on function public.set_auto_reminder_recipients(uuid[]) to authenticated;

-- New automatic reminders take the household's choice.
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

  insert into public.items
    (title, kind, domain_id, time_mode, due_date, remind_at, remind_member_ids, auto_key)
  values (p_title, 'task', p_domain_id, 'scheduled', p_due,
          (p_due + time '09:00') at time zone 'Asia/Jerusalem',
          (select h.auto_remind_member_ids from public.households h
           where h.id = public.current_household_id()),
          p_key)
  on conflict (household_id, auto_key) do update
    set title     = excluded.title,
        domain_id = coalesce(public.items.domain_id, excluded.domain_id)
    where public.items.status = 'open'
      and (public.items.title <> excluded.title or public.items.domain_id is null);
end $$;
