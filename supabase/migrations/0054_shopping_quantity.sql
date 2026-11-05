-- =====================================================================
-- 0054 - How much to buy, apart from the product's name
-- A missing item keeps its quantity in a field of its own (free text: 3,
-- 2 ק"ג, שישייה), so the fixed list keeps only product names: "חלב 3" and
-- "חלב" are one product. A number (with a counted or weighed unit) at the
-- end or the start of a name is taken as its quantity; volumes ("1.5 ליטר")
-- and percents ("3%") stay in the name, and a bare number only up to 99.
-- What is on the fixed list now is cleaned the same way and its duplicates
-- merged (their counts added); open missing items get their quantity out of
-- their name. Names alike in spelling are merged by the parents, one pair at
-- a time; a pair marked "not the same" is kept, so it is not asked again.
-- Run once in the Supabase SQL editor, after 0053.
-- =====================================================================

alter table public.items
  add column quantity text check (quantity is null or length(trim(quantity)) between 1 and 40);

-- Pairs of names on the fixed list the parents said are not the same product.
create table public.shopping_staple_apart (
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  -- The two names as staple_key gives them, in order, joined by "|".
  pair_key     text not null,
  created_at   timestamptz not null default now(),
  primary key (household_id, pair_key)
);

alter table public.shopping_staple_apart enable row level security;

create policy shopping_staple_apart_all on public.shopping_staple_apart for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant select, insert, delete on public.shopping_staple_apart to authenticated;

-- A line of a shopping list as the product and its quantity (null when it has none), the way
-- the app reads it.
create function public.split_quantity(p_line text, out name text, out quantity text)
language plpgsql immutable set search_path = '' as $$
declare
  v_text  text := regexp_replace(trim(coalesce(p_line, '')), '\s+', ' ', 'g');
  v_units text := '(יחידות|יח''|יח׳|יח|חבילות|חבילה|שקיות|שקית|בקבוקים|קרטונים|קרטון|מארזים|מארז|קופסאות|קופסה|ק"ג|ק״ג|קג|קילו|גרם|גר''|גר׳|גר)';
  v_num   text := '([0-9]+(?:[.,][0-9]+)?(?:/[0-9]+)?)';
  v_m     text[];
begin
  name := v_text;
  quantity := null;
  -- At the end: "חלב 3", "חלב x3", "עגבניות 2 ק"ג".
  v_m := regexp_match(v_text,
    '^(.*[^0-9\s.,/x×*])\s*(?:[x×*]\s*)?' || v_num || '(?:\s*' || v_units || ')?\s*$');
  if v_m is not null and v_m[1] ~ '[^0-9 ]'
     and (v_m[3] is not null or split_part(replace(v_m[2], ',', '.'), '/', 1)::numeric <= 99) then
    name := trim(v_m[1]);
    quantity := v_m[2] || coalesce(' ' || v_m[3], '');
    return;
  end if;
  -- At the start: "3 חלב", "2 חבילות קוטג׳".
  v_m := regexp_match(v_text,
    '^(?:[x×*]\s*)?' || v_num || '(?:\s*' || v_units || ')?\s+(\S.*)$');
  if v_m is not null and v_m[3] ~ '[^0-9 ]' and left(v_m[3], 1) <> '%'
     and (v_m[2] is not null or split_part(replace(v_m[1], ',', '.'), '/', 1)::numeric <= 99) then
    name := trim(v_m[3]);
    quantity := v_m[1] || coalesce(' ' || v_m[2], '');
  end if;
end $$;

-- Two names on the fixed list are one product: the one kept takes the other's count, and
-- open missing items under the other name take the kept one.
create function public.merge_staples(p_keep_id uuid, p_drop_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_keep public.shopping_staples%rowtype;
  v_drop public.shopping_staples%rowtype;
begin
  select * into v_keep from public.shopping_staples where id = p_keep_id;
  select * into v_drop from public.shopping_staples where id = p_drop_id;
  if v_keep.id is null or v_drop.id is null or v_keep.id = v_drop.id then
    raise exception 'no such pair';
  end if;
  update public.items
  set title = v_keep.title
  where household_id = v_drop.household_id and kind = 'missing_item' and status = 'open'
    and public.staple_key(title) = v_drop.title_key;
  delete from public.shopping_staples where id = v_drop.id;
  update public.shopping_staples
  set times = v_keep.times + v_drop.times,
      last_added_at = greatest(v_keep.last_added_at, v_drop.last_added_at)
  where id = v_keep.id;
end $$;

grant execute on function public.merge_staples(uuid, uuid) to authenticated;
grant execute on function public.split_quantity(text) to authenticated;

-- Open missing items: their quantity out of their name.
update public.items i
set title = s.name, quantity = s.quantity
from (
  select id, (public.split_quantity(title)).*
  from public.items
  where kind = 'missing_item' and status = 'open' and quantity is null
) s
where i.id = s.id and s.quantity is not null;

-- The fixed list: each name without its quantity, the same names merged into the one added
-- most (named as the cleanest of them), with their counts added.
create temporary table staple_clean as
select s.id, s.household_id, s.times, s.last_added_at, s.title,
       (public.split_quantity(s.title)).name as clean
from public.shopping_staples s;

create temporary table staple_groups as
select household_id, public.staple_key(clean) as clean_key,
       (array_agg(id order by (title = clean) desc, times desc, last_added_at desc))[1] as keep_id,
       (array_agg(clean order by (title = clean) desc, times desc))[1] as keep_title,
       sum(times)::integer as total, max(last_added_at) as last_at
from staple_clean
group by household_id, public.staple_key(clean);

delete from public.shopping_staples s
using staple_clean c, staple_groups g
where s.id = c.id and g.household_id = c.household_id
  and g.clean_key = public.staple_key(c.clean) and s.id <> g.keep_id;

update public.shopping_staples s
set title = g.keep_title, title_key = g.clean_key, times = g.total, last_added_at = g.last_at
from staple_groups g
where s.id = g.keep_id;

drop table staple_groups;
drop table staple_clean;
