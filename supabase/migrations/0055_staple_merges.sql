-- =====================================================================
-- 0055 - What was merged on the fixed list, and undoing it
-- Every merge of two names on the fixed list is written down: which name
-- went into which, with how many times it had been added, and how (by
-- itself when 0054 ran, by a parent, or after the smart check). A merge can
-- be undone: the name comes back with its count, and the pair is marked not
-- the same product, so it is not suggested again.
-- The merges 0054 made by itself are written down from the items bought
-- before: each name written otherwise ("חלב 3") that now counts as another.
-- Run once in the Supabase SQL editor, after 0054.
-- =====================================================================

create table public.shopping_staple_merges (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id()
                references public.households(id) on delete cascade,
  kept_id       uuid references public.shopping_staples(id) on delete set null,
  kept_title    text not null,
  merged_title  text not null,
  -- How many times the merged name had been added, given back if the merge is undone.
  merged_times  integer not null default 1,
  how           text not null check (how in ('auto', 'manual', 'smart')),
  merged_at     timestamptz not null default now()
);

alter table public.shopping_staple_merges enable row level security;

create policy shopping_staple_merges_all on public.shopping_staple_merges for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant select, delete on public.shopping_staple_merges to authenticated;

-- The merges 0054 made: names of items bought before, written otherwise than the name they
-- now count under.
insert into public.shopping_staple_merges
  (household_id, kept_id, kept_title, merged_title, merged_times, how, merged_at)
select s.household_id, s.id, s.title, min(trim(i.title)), count(*)::integer, 'auto', now()
from public.items i
join public.shopping_staples s
  on s.household_id = i.household_id
 and s.title_key = public.staple_key((public.split_quantity(i.title)).name)
left join public.domains d on d.id = i.domain_id
left join public.entities e on e.id = d.entity_id
where i.kind = 'missing_item' and i.shopping_category = 'food'
  and coalesce(e.kind::text, '') <> 'personal'
  and public.staple_key(i.title) <> s.title_key
group by s.household_id, s.id, s.title, public.staple_key(i.title);

-- A number at the end of a name is its quantity only when written apart from it ("חלב 3",
-- "חלב x3"), not when part of a word ("ויטמין D3").
create or replace function public.split_quantity(p_line text, out name text, out quantity text)
language plpgsql immutable set search_path = '' as $$
declare
  v_text  text := regexp_replace(trim(coalesce(p_line, '')), '\s+', ' ', 'g');
  v_units text := '(יחידות|יח''|יח׳|יח|חבילות|חבילה|שקיות|שקית|בקבוקים|קרטונים|קרטון|מארזים|מארז|קופסאות|קופסה|ק"ג|ק״ג|קג|קילו|גרם|גר''|גר׳|גר)';
  v_num   text := '([0-9]+(?:[.,][0-9]+)?(?:/[0-9]+)?)';
  v_m     text[];
begin
  name := v_text;
  quantity := null;
  v_m := regexp_match(v_text,
    '^(.*[^0-9\s.,/x×*])(?:\s+|\s*[x×*]\s*)' || v_num || '(?:\s*' || v_units || ')?\s*$');
  if v_m is not null and v_m[1] ~ '[^0-9 ]'
     and (v_m[3] is not null or split_part(replace(v_m[2], ',', '.'), '/', 1)::numeric <= 99) then
    name := trim(v_m[1]);
    quantity := v_m[2] || coalesce(' ' || v_m[3], '');
    return;
  end if;
  v_m := regexp_match(v_text,
    '^(?:[x×*]\s*)?' || v_num || '(?:\s*' || v_units || ')?\s+(\S.*)$');
  if v_m is not null and v_m[3] ~ '[^0-9 ]' and left(v_m[3], 1) <> '%'
     and (v_m[2] is not null or split_part(replace(v_m[1], ',', '.'), '/', 1)::numeric <= 99) then
    name := trim(v_m[3]);
    quantity := v_m[1] || coalesce(' ' || v_m[2], '');
  end if;
end $$;

-- Two names are one product: written down, then the kept one takes the other's count and
-- open missing items under the other name take the kept one.
drop function public.merge_staples(uuid, uuid);

create function public.merge_staples(p_keep_id uuid, p_drop_id uuid, p_how text default 'manual')
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

-- Undoes a merge: the merged name comes back with its count (taken off the kept one), and
-- the two are marked not the same product.
create function public.unmerge_staple(p_merge_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_merge public.shopping_staple_merges%rowtype;
  v_kept  public.shopping_staples%rowtype;
  v_key   text;
begin
  select * into v_merge from public.shopping_staple_merges where id = p_merge_id;
  if v_merge.id is null then
    raise exception 'no such merge';
  end if;
  v_key := public.staple_key(v_merge.merged_title);
  if v_key = public.staple_key(v_merge.kept_title) then
    delete from public.shopping_staple_merges where id = v_merge.id;
    return;
  end if;
  select * into v_kept from public.shopping_staples where id = v_merge.kept_id;
  if v_kept.id is not null and v_kept.times <= v_merge.merged_times then
    -- The kept name came only from this one (cut out of it): it takes its name back.
    update public.shopping_staples set title = v_merge.merged_title, title_key = v_key
    where id = v_kept.id;
  else
    insert into public.shopping_staples (household_id, title, title_key, times)
    values (v_merge.household_id, v_merge.merged_title, v_key, greatest(v_merge.merged_times, 1))
    on conflict (household_id, title_key) do nothing;
    update public.shopping_staples
    set times = greatest(times - v_merge.merged_times, 1)
    where id = v_merge.kept_id;
  end if;
  insert into public.shopping_staple_apart (household_id, pair_key)
  values (v_merge.household_id,
          least(v_key, public.staple_key(v_merge.kept_title)) || '|' ||
          greatest(v_key, public.staple_key(v_merge.kept_title)))
  on conflict do nothing;
  delete from public.shopping_staple_merges where id = v_merge.id;
end $$;

grant execute on function public.merge_staples(uuid, uuid, text) to authenticated;
grant execute on function public.unmerge_staple(uuid) to authenticated;
