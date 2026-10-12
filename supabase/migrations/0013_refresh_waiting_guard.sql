-- =====================================================================
-- 0013 - Close refresh_waiting to outsiders
-- refresh_waiting() moves a waiting item whose conditions are all met to
-- "needs completion". It runs with full rights and did not check whose item
-- it was, and anyone could call it, even without signing in. Now only a signed
-- in parent can call it, and only on an item of their own household. Its
-- triggers keep working as before.
-- Run once in the Supabase SQL editor, after 0012.
-- =====================================================================

create or replace function public.refresh_waiting(p_item_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.items i
  set time_mode = null
  where i.id = p_item_id
    and i.household_id = public.current_household_id()
    and i.time_mode = 'waiting'
    and exists (select 1 from public.prerequisites p where p.item_id = i.id)
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
