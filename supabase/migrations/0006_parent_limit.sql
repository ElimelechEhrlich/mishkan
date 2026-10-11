-- =====================================================================
-- 0006 - At most two parents in a household
-- A third parent entity is refused, whether added in settings or created when
-- a parent joins without choosing an existing parent entity.
-- Households that already have more are left as they are.
-- Run once in the Supabase SQL editor, after 0005.
-- =====================================================================

create function public.entities_parent_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Two parents added at the same moment wait for each other here.
  perform 1 from public.households h where h.id = new.household_id for update;
  if (select count(*) from public.entities e
      where e.household_id = new.household_id and e.kind = 'parent') >= 2 then
    raise exception 'בבית יש כבר שני הורים';
  end if;
  return new;
end $$;

create trigger entities_parent_limit
  before insert on public.entities
  for each row when (new.kind = 'parent')
  execute function public.entities_parent_limit();
