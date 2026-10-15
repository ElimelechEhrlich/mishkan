-- =====================================================================
-- 0040 - What waits to be completed is seen by both parents
-- An item with no domain yet was seen only by the parent who completes it
-- (review_by). Now both parents see it, whoever opened it, and either can
-- complete it. The one exception is what is private: an item already given
-- the parent's personal entity ("אישי") stays with its owner alone.
-- Nothing that exists is changed but who can see these items.
-- Run once in the Supabase SQL editor, after 0039.
-- =====================================================================

create or replace function public.can_see_item(p_item_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.household_id = public.current_household_id()
      and (
        (i.domain_id is null and (i.entity_id is null or public.can_see_entity(i.entity_id)))
        or (i.domain_id is not null and public.can_see_domain(i.domain_id))
      )
  )
$$;

drop policy items_all on public.items;
create policy items_all on public.items for all to authenticated
  using (
    household_id = public.current_household_id()
    and (
      (domain_id is null and (entity_id is null or public.can_see_entity(entity_id)))
      or (domain_id is not null and public.can_see_domain(domain_id))
    )
  )
  with check (
    household_id = public.current_household_id()
    and (
      (domain_id is null and (entity_id is null or public.can_see_entity(entity_id)))
      or (domain_id is not null and public.can_see_domain(domain_id))
    )
  );
