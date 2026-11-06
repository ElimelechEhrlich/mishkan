-- =====================================================================
-- 0057 - Another spelling of a name is not a detail of it
-- A merge keeps what the merged name said beyond the kept one as a detail
-- (0056). When the merged name is only the kept one written otherwise
-- ("איטריות" and "אטריות", "עגבניה" and "עגבניות"), nothing is kept: the
-- names are compared without the letters that come and go in spelling
-- (י, ו, א, ה), marks, final forms and plural endings. Such details kept so
-- far are taken away, from the fixed list and from open missing items.
-- Several details chosen together are kept each on its own.
-- Run once in the Supabase SQL editor, after 0056.
-- =====================================================================

-- A name as it sounds, for telling another spelling of it: no marks, spaces, final forms, the
-- letters that come and go in spelling, or plural and feminine endings.
create function public.staple_sound(p_text text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(
           regexp_replace(
             translate(lower(trim(coalesce(p_text, ''))), 'ךםןףץ', 'כמנפצ'),
             '(ות|ימ|ה)(\s|$)', '\2', 'g'),
           '[\s''"׳״`.,\-יואה]', '', 'g')
$$;

create or replace function public.staple_remainder(p_kept text, p_merged text) returns text
language sql immutable set search_path = '' as $$
  select case
    when public.staple_key(p_merged) like public.staple_key(p_kept) || ' %'
      then trim(substr(regexp_replace(trim(p_merged), '\s+', ' ', 'g'),
                       length(regexp_replace(trim(p_kept), '\s+', ' ', 'g')) + 1))
    -- Only another spelling of the kept name: nothing beyond it.
    when public.staple_sound(p_merged) = public.staple_sound(p_kept) then ''
    else trim(p_merged)
  end
$$;

-- What was kept so far that is only another spelling of its name.
delete from public.shopping_staple_details
where public.staple_sound(details) = public.staple_sound(staple_key);

update public.items
set details = null
where kind = 'missing_item' and status = 'open' and details is not null
  and public.staple_sound(details) = public.staple_sound(title);

-- Several details chosen together ("ונייש, לבן") are kept each on its own, to offer again.
create or replace function public.items_keep_staple_detail() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_part text;
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
  foreach v_part in array string_to_array(new.details, ',') loop
    if public.staple_sound(v_part) <> public.staple_sound(new.title) then
      perform public.keep_staple_detail(new.household_id, new.title, v_part);
    end if;
  end loop;
  return null;
end $$;
