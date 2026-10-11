-- =====================================================================
-- 0003 - Shopping (see DATA_MODEL.md, "קניות")
-- A missing item (פריט חסר) lives in the shopping domain of an entity and has
-- a category: food, clothing, urgent or planned. "Bought" is status = 'done'.
-- A shopping run (סבב קניות) gathers the open missing items of one category,
-- from every shared entity or from the parent's personal entity only.
-- It closes on its own when every item in it is bought, or by hand; then the
-- items that were not bought go back to the list.
-- Run once in the Supabase SQL editor, after 0002.
-- =====================================================================

-- The new kinds are only named inside function bodies, which run after this
-- script is committed; expressions below avoid them on purpose.
alter type public.item_kind add value if not exists 'missing_item';
alter type public.item_kind add value if not exists 'shopping_run';

create type public.shopping_category as enum ('food', 'clothing', 'urgent', 'planned');

alter table public.items
  add column shopping_category public.shopping_category,
  add column run_id uuid references public.items(id) on delete set null;
create index items_run_idx on public.items (run_id) where run_id is not null;

-- "Fully assigned": tasks and goals need a domain and a time; every other kind a domain.
drop index public.items_review_idx;
alter table public.items drop column is_complete;
alter table public.items add column is_complete boolean generated always as (
  case
    when kind in ('task', 'goal') then domain_id is not null and time_mode is not null
    else domain_id is not null
  end
) stored;
create index items_review_idx on public.items (review_by) where not is_complete;

-- ---------- Triggers: shopping rules ---------------------------------
-- A missing item sits in a shopping domain. Only a missing item can be in a run,
-- and the run must be a shopping run of the same household.
create function public.items_check_shopping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'missing_item'
     and new.domain_id is not null
     and not exists (
       select 1 from public.domains d where d.id = new.domain_id and d.role = 'shopping'
     ) then
    raise exception 'a missing item must be in a shopping domain';
  end if;

  if new.kind <> 'missing_item' then
    new.run_id := null;
  end if;

  if new.run_id is not null and not exists (
    select 1 from public.items r
    where r.id = new.run_id and r.kind = 'shopping_run' and r.household_id = new.household_id
  ) then
    raise exception 'run not found';
  end if;

  return new;
end $$;

-- Runs after items_before_write (alphabetical), which fills in the household.
create trigger items_check_shopping
  before insert or update on public.items
  for each row execute function public.items_check_shopping();

-- Buying the last item closes the run; closing a run sends what was not bought back to the list.
create function public.items_shopping_after_status() returns trigger
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

  return null;
end $$;

create trigger items_shopping_after_status
  after update of status on public.items
  for each row when (old.status is distinct from new.status)
  execute function public.items_shopping_after_status();

-- ---------- Creating a run -------------------------------------------
-- Shared runs sit in the home's shopping domain and take items from every shared entity.
-- Private runs sit in the parent's personal shopping domain and take items from it only.
create function public.create_shopping_run(
  p_category public.shopping_category,
  p_private  boolean
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_member uuid := public.current_member_id();
  v_domain uuid;
  v_run    uuid;
begin
  select d.id into v_domain
  from public.domains d
  join public.entities e on e.id = d.entity_id
  where d.role = 'shopping'
    and e.household_id = public.current_household_id()
    and (
      (p_private and e.kind = 'personal' and e.member_id = v_member)
      or (not p_private and e.kind = 'home')
    );
  if v_domain is null then
    raise exception 'shopping domain not found';
  end if;

  insert into public.items (title, kind, domain_id)
  values (
    'סבב קניות · ' || case p_category
      when 'food'     then 'מזון'
      when 'clothing' then 'ביגוד'
      when 'urgent'   then 'דחוף'
      when 'planned'  then 'מתוכננת'
    end,
    'shopping_run',
    v_domain
  )
  returning id into v_run;

  update public.items i
  set run_id = v_run
  from public.domains d
  join public.entities e on e.id = d.entity_id
  where d.id = i.domain_id
    and i.kind = 'missing_item'
    and i.status = 'open'
    and i.run_id is null
    and i.shopping_category = p_category
    and (
      (p_private and e.kind = 'personal' and e.member_id = v_member)
      or (not p_private and e.kind <> 'personal')
    );
  if not found then
    raise exception 'no missing items in this category';
  end if;

  return v_run;
end $$;
