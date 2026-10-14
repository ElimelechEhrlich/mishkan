-- =====================================================================
-- 0030 - Fixes from the full audit
-- 1. "Remind me again" no longer shows a title the parent can no longer see
--    (an item moved meanwhile into the other parent's private entity).
-- 2. A waiting item is released when the last thing it waited on is gone,
--    instead of waiting forever.
-- 3. Shopping: an item bought in a finished run and put back as not bought
--    returns to the list (it stayed tied to the finished run and vanished).
--    A run also finishes when its last open item is deleted or converted.
-- 4. An item that becomes a step takes its goal's entity with its domain.
-- 5. Birthday and anniversary reminders sync for both parents: syncing one
--    that waits in the other parent's "needs completion" no longer fails.
-- Nothing that exists is deleted.
-- Run once in the Supabase SQL editor, after 0029.
-- =====================================================================

-- ---------- 1. Snoozed reminders follow who may see the item --------
create or replace function public.claim_due_snoozes()
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
  left join public.domains dm on dm.id = i.domain_id
  left join public.entities e on e.id = dm.entity_id
  join public.push_subscriptions s on s.member_id = d.member_id
  -- The same rule as the item's own reminders: no domain, its parent to complete it;
  -- a private entity, its owner only.
  where (i.domain_id is null and i.review_by = d.member_id)
     or (i.domain_id is not null and (e.kind <> 'personal' or e.member_id = d.member_id))
$$;

revoke execute on function public.claim_due_snoozes() from public, anon, authenticated;
grant execute on function public.claim_due_snoozes() to service_role;

-- ---------- 2. Nothing left to wait on releases the item ------------
create or replace function public.refresh_waiting(p_item_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.items i
  set time_mode = null
  where i.id = p_item_id
    and i.household_id = public.current_household_id()
    and i.time_mode = 'waiting'
    and not exists (
      select 1
      from public.prerequisites p
      left join public.items d on d.id = p.depends_on_item_id
      where p.item_id = i.id
        and (
          (p.depends_on_item_id is null and not p.is_met)
          or (p.depends_on_item_id is not null and d.status <> 'done')
        )
    )
$$;

revoke execute on function public.refresh_waiting(uuid) from public, anon;
grant execute on function public.refresh_waiting(uuid) to authenticated;

-- ---------- 3. Shopping runs ----------------------------------------
create or replace function public.items_shopping_after_status() returns trigger
language plpgsql as $$
begin
  if new.kind = 'missing_item' and new.run_id is not null and new.status = 'done'
     and not exists (
       select 1 from public.items i
       where i.run_id = new.run_id and i.status = 'open'
     ) then
    update public.items set status = 'done' where id = new.run_id and status = 'open';
  end if;

  if new.kind = 'shopping_run' and new.status = 'done' then
    update public.items set run_id = null where run_id = new.id and status = 'open';
  end if;

  -- Put back as not bought after its run finished: back on the list, free for a new run.
  if new.kind = 'missing_item' and new.status = 'open' and new.run_id is not null
     and exists (
       select 1 from public.items r where r.id = new.run_id and r.status <> 'open'
     ) then
    update public.items set run_id = null where id = new.id;
  end if;

  return null;
end $$;

-- A run whose last open item was deleted, converted or taken out finishes, as when its
-- last item is bought.
create or replace function public.items_close_emptied_run() returns trigger
language plpgsql as $$
begin
  if old.run_id is not null
     and not exists (
       select 1 from public.items i
       where i.run_id = old.run_id and i.status = 'open' and i.kind = 'missing_item'
     ) then
    update public.items set status = 'done' where id = old.run_id and status = 'open';
  end if;
  return null;
end $$;

create trigger items_close_emptied_run_after_delete
  after delete on public.items
  for each row when (old.run_id is not null)
  execute function public.items_close_emptied_run();

create trigger items_close_emptied_run_after_update
  after update of run_id, kind on public.items
  for each row when (old.run_id is not null
                     and (new.run_id is distinct from old.run_id or new.kind <> old.kind))
  execute function public.items_close_emptied_run();

-- What is already stuck: open items tied to a finished run go back to the list.
update public.items i
set run_id = null
where i.kind = 'missing_item'
  and i.status = 'open'
  and i.run_id is not null
  and exists (select 1 from public.items r where r.id = i.run_id and r.status <> 'open');

-- ---------- 4. A step's entity follows its new goal -----------------
drop trigger items_sync_entity on public.items;
create trigger items_sync_entity
  before insert or update of domain_id, entity_id, parent_id on public.items
  for each row execute function public.items_sync_entity();

-- ---------- 5. Occasion reminders sync for both parents -------------
-- It runs with full rights, so a reminder waiting in the other parent's "needs
-- completion" can be updated too. Who may call it is checked here instead: the key must
-- be one of an occasion of an entity the caller can see, in their own household.
create or replace function public.sync_auto_reminder(
  p_prefix    text,
  p_key       text,
  p_title     text,
  p_domain_id uuid,
  p_due       date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
  v_entity    uuid;
begin
  if v_household is null then
    raise exception 'not signed in to a household';
  end if;
  if p_prefix !~ '^(birthday|anniversary):[0-9a-f-]{36}:$' then
    raise exception 'not an occasion reminder';
  end if;
  if left(p_key, length(p_prefix)) <> p_prefix then
    raise exception 'the key must start with the prefix';
  end if;
  v_entity := split_part(p_prefix, ':', 2)::uuid;
  if not public.can_see_entity(v_entity) then
    raise exception 'entity not found';
  end if;
  if p_domain_id is not null and not public.can_see_domain(p_domain_id) then
    raise exception 'domain not found';
  end if;

  delete from public.items
  where household_id = v_household
    and auto_key like p_prefix || '%'
    and auto_key <> p_key
    and status = 'open';

  insert into public.items
    (title, kind, domain_id, time_mode, due_date, remind_at, remind_member_ids, auto_key)
  values (p_title, 'task', p_domain_id, 'scheduled', p_due,
          (p_due + time '09:00') at time zone 'Asia/Jerusalem',
          (select h.auto_remind_member_ids from public.households h where h.id = v_household),
          p_key)
  on conflict (household_id, auto_key) do update
    set title     = excluded.title,
        domain_id = coalesce(public.items.domain_id, excluded.domain_id)
    where public.items.status = 'open'
      and (public.items.title <> excluded.title or public.items.domain_id is null);
end $$;

revoke execute on function public.sync_auto_reminder(text, text, text, uuid, date)
  from public, anon;
grant execute on function public.sync_auto_reminder(text, text, text, uuid, date)
  to authenticated;
