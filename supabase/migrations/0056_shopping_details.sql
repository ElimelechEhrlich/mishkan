-- =====================================================================
-- 0056 - Details of what to buy: brand, kind or size
-- A missing item keeps, apart from its name and quantity, its details in
-- free text ("מקסימה גדול"), so the fixed list keeps the product itself
-- ("מרכך כביסה") and still remembers how the family buys it. Every detail
-- added to a name on the fixed list is kept for that name, with how many
-- times, to offer again. A merge keeps what the merged name said beyond the
-- kept one ("מרכך כביסה מקסימה גדול" into "מרכך כביסה" keeps "מקסימה גדול";
-- "פיירי" into "נוזל כלים" keeps "פיירי") as a detail of the kept name.
-- Run once in the Supabase SQL editor, after 0055.
-- =====================================================================

alter table public.items
  add column details text check (details is null or length(trim(details)) between 1 and 60);

-- The details used for each name of the fixed list, by its key.
create table public.shopping_staple_details (
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  staple_key   text not null,
  details      text not null check (length(trim(details)) between 1 and 60),
  details_key  text not null,
  times        integer not null default 1,
  last_used_at timestamptz not null default now(),
  primary key (household_id, staple_key, details_key)
);

alter table public.shopping_staple_details enable row level security;

create policy shopping_staple_details_all on public.shopping_staple_details for all
  to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant select, insert, update, delete on public.shopping_staple_details to authenticated;
-- A merge, made as the parent, writes itself down.
grant insert on public.shopping_staple_merges to authenticated;

-- Keeps a detail for a name of the fixed list (counted again when used again).
create function public.keep_staple_detail(p_household_id uuid, p_title text, p_details text)
returns void
language sql security definer set search_path = '' as $$
  insert into public.shopping_staple_details (household_id, staple_key, details, details_key)
  select p_household_id, public.staple_key(p_title), trim(p_details),
         public.staple_key(p_details)
  where length(trim(coalesce(p_details, ''))) between 1 and 60
  on conflict (household_id, staple_key, details_key) do update
    set times = public.shopping_staple_details.times + 1, last_used_at = now()
$$;

-- A "סופר" item of a shared list with details: its details are kept for its name.
create function public.items_keep_staple_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'missing_item' or new.shopping_category is distinct from 'food'
     or new.details is null
     or (tg_op = 'UPDATE' and old.details is not distinct from new.details)
     or exists (
       select 1 from public.domains d join public.entities e on e.id = d.entity_id
       where d.id = new.domain_id and e.kind = 'personal'
     ) then
    return null;
  end if;
  perform public.keep_staple_detail(new.household_id, new.title, new.details);
  return null;
end $$;

create trigger items_keep_staple_detail
  after insert or update of details on public.items
  for each row execute function public.items_keep_staple_detail();

-- What a merged name says beyond the kept one: the words after it, or the whole name when it
-- does not start with it.
create function public.staple_remainder(p_kept text, p_merged text) returns text
language sql immutable set search_path = '' as $$
  select case
    when public.staple_key(p_merged) like public.staple_key(p_kept) || ' %'
      then trim(substr(regexp_replace(trim(p_merged), '\s+', ' ', 'g'),
                       length(regexp_replace(trim(p_kept), '\s+', ' ', 'g')) + 1))
    else trim(p_merged)
  end
$$;

-- A merge keeps the merged name's own details and what it said beyond the kept name.
create or replace function public.merge_staples(p_keep_id uuid, p_drop_id uuid,
                                                p_how text default 'manual')
returns void
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
  insert into public.shopping_staple_merges (household_id, kept_id, kept_title, merged_title,
                                             merged_times, how)
  values (v_keep.household_id, v_keep.id, v_keep.title, v_drop.title, v_drop.times,
          case when p_how in ('manual', 'smart') then p_how else 'manual' end);
  insert into public.shopping_staple_details (household_id, staple_key, details, details_key)
  select v_keep.household_id, v_keep.title_key, r.remainder, public.staple_key(r.remainder)
  from (select public.staple_remainder(v_keep.title, v_drop.title) as remainder) r
  where length(r.remainder) between 1 and 60
  on conflict (household_id, staple_key, details_key) do update
    set times = public.shopping_staple_details.times + 1, last_used_at = now();
  insert into public.shopping_staple_details
    (household_id, staple_key, details, details_key, times, last_used_at)
  select household_id, v_keep.title_key, details, details_key, times, last_used_at
  from public.shopping_staple_details
  where household_id = v_drop.household_id and staple_key = v_drop.title_key
  on conflict (household_id, staple_key, details_key) do update
    set times = public.shopping_staple_details.times + excluded.times;
  -- Open items under the merged name take the kept one, and keep what it said as details.
  update public.items
  set title = v_keep.title,
      details = coalesce(details, nullif(public.staple_remainder(v_keep.title, v_drop.title), ''))
  where household_id = v_drop.household_id and kind = 'missing_item' and status = 'open'
    and public.staple_key(title) = v_drop.title_key;
  delete from public.shopping_staples where id = v_drop.id;
  update public.shopping_staples
  set times = v_keep.times + v_drop.times,
      last_added_at = greatest(v_keep.last_added_at, v_drop.last_added_at)
  where id = v_keep.id;
end $$;

grant execute on function public.merge_staples(uuid, uuid, text) to authenticated;
revoke all on function public.keep_staple_detail(uuid, text, text) from public, anon, authenticated;

-- What the merges made so far by a parent or the smart check said beyond the kept name.
select public.keep_staple_detail(m.household_id, m.kept_title,
                                 public.staple_remainder(m.kept_title, m.merged_title))
from public.shopping_staple_merges m
where m.how in ('manual', 'smart');
