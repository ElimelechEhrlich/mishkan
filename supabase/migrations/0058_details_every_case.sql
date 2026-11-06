-- =====================================================================
-- 0058 - Details kept right in every case
-- - A name renamed on the fixed list keeps the details used with it (they
--   were kept under its old name, and seemed lost).
-- - A merge never fails on a long name: what an open item keeps of it as
--   details is cut to the 60 letters details hold.
-- - Adding through the chat finds a name of the fixed list at the start of
--   what was asked ("מרכך כביסה מקסימה") and keeps the rest as its details,
--   as the add row does (the chat asks no question, so only a whole name of
--   the list, word by word, counts).
-- Run once in the Supabase SQL editor, after 0057.
-- =====================================================================

-- A name renamed on the fixed list takes its details along; one the new name already has is
-- counted together.
create function public.staples_move_details() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.title_key = old.title_key then
    return null;
  end if;
  insert into public.shopping_staple_details
    (household_id, staple_key, details, details_key, times, last_used_at)
  select household_id, new.title_key, details, details_key, times, last_used_at
  from public.shopping_staple_details
  where household_id = old.household_id and staple_key = old.title_key
  on conflict (household_id, staple_key, details_key) do update
    set times = public.shopping_staple_details.times + excluded.times,
        last_used_at = greatest(public.shopping_staple_details.last_used_at,
                                excluded.last_used_at);
  delete from public.shopping_staple_details
  where household_id = old.household_id and staple_key = old.title_key;
  return null;
end $$;

create trigger shopping_staples_move_details
  after update of title_key on public.shopping_staples
  for each row execute function public.staples_move_details();

-- A merge, as in 0056, with what an open item keeps cut to the 60 letters details hold.
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
      details = coalesce(details,
                         nullif(left(public.staple_remainder(v_keep.title, v_drop.title), 60), ''))
  where household_id = v_drop.household_id and kind = 'missing_item' and status = 'open'
    and public.staple_key(title) = v_drop.title_key;
  delete from public.shopping_staples where id = v_drop.id;
  update public.shopping_staples
  set times = v_keep.times + v_drop.times,
      last_added_at = greatest(v_keep.last_added_at, v_drop.last_added_at)
  where id = v_keep.id;
end $$;

grant execute on function public.merge_staples(uuid, uuid, text) to authenticated;

-- A name asked for through the chat: the longest name of the household's fixed list it starts
-- with, word by word, and the rest as its details; the name whole when none.
create function public.split_known_staple(p_name text, out name text, out details text)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_text text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_key  text := public.staple_key(p_name);
  v_hit  public.shopping_staples%rowtype;
begin
  name := v_text;
  details := null;
  if exists (select 1 from public.shopping_staples where title_key = v_key) then
    return;
  end if;
  select * into v_hit
  from public.shopping_staples
  where v_key like title_key || ' %'
  order by length(title_key) desc
  limit 1;
  if v_hit.id is not null then
    name := v_hit.title;
    details := nullif(left(trim(substr(v_text, length(v_hit.title_key) + 1)), 60), '');
  end if;
end $$;

grant execute on function public.split_known_staple(text) to authenticated;
