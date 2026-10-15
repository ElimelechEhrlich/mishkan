-- =====================================================================
-- 0041 - The fixed shopping list ("הרשימה הקבועה")
-- Every "סופר" item ever added to a shared list is kept here, each name once,
-- with how many times it was added. It does not empty when things are bought:
-- the shopping list is made from it by ticking what is needed this time.
-- What is added to a parent's personal entity stays out (it is private).
-- It starts with every such item added so far.
-- Run once in the Supabase SQL editor, after 0040.
-- =====================================================================

create table public.shopping_staples (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  title          text not null check (length(trim(title)) > 0),
  -- The name trimmed, in lower case and with single spaces, as the app matches names.
  title_key      text not null,
  times          integer not null default 1,
  last_added_at  timestamptz not null default now(),
  unique (household_id, title_key)
);

alter table public.shopping_staples enable row level security;

create policy shopping_staples_all on public.shopping_staples for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant select, insert, update, delete on public.shopping_staples to authenticated;

create function public.staple_key(p_title text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(p_title), '\s+', ' ', 'g'))
$$;

-- A "סופר" item added to a shared list (or made one) is counted in the fixed list.
create function public.items_keep_staple() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'missing_item' or new.shopping_category is distinct from 'food'
     or length(trim(new.title)) = 0
     or (tg_op = 'UPDATE' and old.kind = 'missing_item'
         and old.shopping_category is not distinct from 'food')
     or exists (
       select 1 from public.domains d join public.entities e on e.id = d.entity_id
       where d.id = new.domain_id and e.kind = 'personal'
     ) then
    return null;
  end if;
  insert into public.shopping_staples (household_id, title, title_key)
  values (new.household_id, trim(new.title), public.staple_key(new.title))
  on conflict (household_id, title_key) do update
    set times = public.shopping_staples.times + 1, last_added_at = now();
  return null;
end $$;

create trigger items_keep_staple
  after insert or update of kind, shopping_category on public.items
  for each row execute function public.items_keep_staple();

-- What was added so far.
insert into public.shopping_staples (household_id, title, title_key, times, last_added_at)
select i.household_id, min(trim(i.title)), public.staple_key(i.title), count(*), max(i.created_at)
from public.items i
left join public.domains d on d.id = i.domain_id
left join public.entities e on e.id = d.entity_id
where i.kind = 'missing_item' and i.shopping_category = 'food'
  and length(trim(i.title)) > 0
  and coalesce(e.kind::text, '') <> 'personal'
group by i.household_id, public.staple_key(i.title)
on conflict (household_id, title_key) do nothing;
