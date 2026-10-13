-- =====================================================================
-- 0024 - The entity an item belongs to, even before it has a domain
-- An item can be given an entity (such as a child) without a domain yet, by
-- choosing only the entity, or by adding it from that entity's page. The item
-- still waits in "needs completion", but the entity is kept, so completing it
-- asks only for the domain. Once a domain is chosen, the entity follows it.
-- An item's visibility does not change: it still goes by its domain.
-- Nothing that exists is changed.
-- Run once in the Supabase SQL editor, after 0023.
-- =====================================================================

alter table public.items
  add column entity_id uuid references public.entities(id) on delete set null;

-- With a domain, the entity is the domain's. Without one, the entity chosen must be
-- one the parent can see in their own home.
create function public.items_sync_entity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.domain_id is not null then
    select d.entity_id into new.entity_id from public.domains d where d.id = new.domain_id;
  elsif new.entity_id is not null and not exists (
    select 1 from public.entities e
    where e.id = new.entity_id and e.household_id = new.household_id
  ) then
    raise exception 'the entity is not in this home';
  end if;
  return new;
end $$;

-- Runs after items_before_write, which fills in the household.
create trigger items_sync_entity
  before insert or update of domain_id, entity_id on public.items
  for each row execute function public.items_sync_entity();

-- Appointments can be added with an entity and no domain, like any item.
drop function public.create_appointments(
  text, uuid, timestamptz[], public.meeting_place, text, text, text
);

create function public.create_appointments(
  p_title       text,
  p_domain_id   uuid,
  p_starts      timestamptz[],
  p_place_kind  public.meeting_place,
  p_place       text,
  p_meeting_url text,
  p_with_whom   text,
  p_entity_id   uuid default null
) returns integer
language plpgsql set search_path = '' as $$
declare
  v_series uuid := case when cardinality(p_starts) > 1 then gen_random_uuid() end;
  v_start  timestamptz;
  v_count  integer := 0;
begin
  if cardinality(p_starts) is null or cardinality(p_starts) = 0 then
    raise exception 'an appointment needs a date and time';
  end if;
  if cardinality(p_starts) > 104 then
    raise exception 'too many appointments at once';
  end if;
  foreach v_start in array p_starts loop
    insert into public.items
      (title, kind, domain_id, entity_id, time_mode, due_date, starts_at,
       place_kind, place, meeting_url, with_whom, series_id)
    values
      (p_title, 'appointment', p_domain_id, p_entity_id, 'scheduled',
       (v_start at time zone 'Asia/Jerusalem')::date, v_start,
       p_place_kind, nullif(trim(p_place), ''), nullif(trim(p_meeting_url), ''),
       nullif(trim(p_with_whom), ''), v_series);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

grant execute on function public.create_appointments(
  text, uuid, timestamptz[], public.meeting_place, text, text, text, uuid
) to authenticated;
