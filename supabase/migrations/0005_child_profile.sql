-- =====================================================================
-- 0005 - Entity profiles and automatic reminders
-- A child entity gets an ID number, a birth date (and whether the birth was
-- after sunset, which moves the Hebrew date a day on), notes, and open lists
-- of values: hobbies and strengths to start with, and any list added later.
-- A parent entity gets a birth date too, and the couple entity a wedding date.
-- Items can carry an auto_key, so the app can keep one automatic reminder per
-- occasion (such as a child's Hebrew birthday) without making duplicates.
-- Run once in the Supabase SQL editor, after 0004.
-- =====================================================================

alter table public.entities
  add column id_number         text,
  add column birth_date        date,
  add column born_after_sunset boolean not null default false,
  add column notes             text,
  add column wedding_date      date,
  add column wedding_after_sunset boolean not null default false;

-- ---------- Lists of values on an entity -----------------------------
create table public.entity_lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_id    uuid not null references public.entities(id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index entity_lists_entity_idx on public.entity_lists (entity_id);

create table public.entity_list_values (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.entity_lists(id) on delete cascade,
  value      text not null check (length(trim(value)) > 0),
  created_at timestamptz not null default now()
);
create index entity_list_values_list_idx on public.entity_list_values (list_id);

-- A list takes its household from its entity and never moves to another entity.
create function public.entity_lists_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.entity_id := old.entity_id;
  end if;
  select e.household_id into new.household_id from public.entities e where e.id = new.entity_id;
  if new.household_id is null then
    raise exception 'entity not found';
  end if;
  return new;
end $$;

create trigger entity_lists_before_write
  before insert or update on public.entity_lists
  for each row execute function public.entity_lists_before_write();

-- Every child starts with hobbies and strengths.
create function public.entities_seed_lists() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.entity_lists (household_id, entity_id, title, sort_order) values
    (new.household_id, new.id, 'תחביבים', 1),
    (new.household_id, new.id, 'חוזקות',  2);
  return new;
end $$;

create trigger entities_seed_lists
  after insert on public.entities
  for each row when (new.kind = 'child')
  execute function public.entities_seed_lists();

insert into public.entity_lists (household_id, entity_id, title, sort_order)
select e.household_id, e.id, l.title, l.sort_order
from public.entities e
cross join (values ('תחביבים', 1), ('חוזקות', 2)) as l(title, sort_order)
where e.kind = 'child';

-- ---------- Row Level Security ---------------------------------------
create function public.can_see_list(p_list_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entity_lists l
    where l.id = p_list_id and public.can_see_entity(l.entity_id)
  )
$$;

alter table public.entity_lists       enable row level security;
alter table public.entity_list_values enable row level security;

create policy entity_lists_all on public.entity_lists for all to authenticated
  using (household_id = public.current_household_id() and public.can_see_entity(entity_id))
  with check (household_id = public.current_household_id() and public.can_see_entity(entity_id));

create policy entity_list_values_all on public.entity_list_values for all to authenticated
  using (public.can_see_list(list_id))
  with check (public.can_see_list(list_id));

grant select, insert, update, delete on public.entity_lists, public.entity_list_values to authenticated;

-- ---------- Automatic reminders --------------------------------------
alter table public.items add column auto_key text;
alter table public.items add constraint items_auto_key_unique unique (household_id, auto_key);

-- Keeps one open reminder for an occasion: open reminders of the same occasion under an
-- older key (say, last year's date) are removed, and the current one is added once.
-- A reminder that was marked done keeps its key, so it is not added again.
-- Keys are '<occasion>:<entity id>:<date>', such as 'birthday:<id>:2027-10-27'.
create function public.sync_auto_reminder(
  p_prefix    text,
  p_key       text,
  p_title     text,
  p_domain_id uuid,
  p_due       date
) returns void
language plpgsql set search_path = '' as $$
begin
  if left(p_key, length(p_prefix)) <> p_prefix then
    raise exception 'the key must start with the prefix';
  end if;

  delete from public.items
  where household_id = public.current_household_id()
    and auto_key like p_prefix || '%'
    and auto_key <> p_key
    and status = 'open';

  -- An open reminder takes the current title (say, after a rename) and gets a domain
  -- back if its domain was deleted; its date stays as the parents may have moved it.
  insert into public.items (title, kind, domain_id, time_mode, due_date, auto_key)
  values (p_title, 'task', p_domain_id, 'scheduled', p_due, p_key)
  on conflict (household_id, auto_key) do update
    set title     = excluded.title,
        domain_id = coalesce(public.items.domain_id, excluded.domain_id)
    where public.items.status = 'open'
      and (public.items.title <> excluded.title or public.items.domain_id is null);
end $$;

-- Open reminders of a date go with it: when the date is cleared, or the entity is
-- deleted (otherwise they would wait in "needs completion" for nothing).
create function public.entities_clear_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.items
    where household_id = old.household_id and status = 'open'
      and (auto_key like 'birthday:' || old.id || ':%'
           or auto_key like 'anniversary:' || old.id || ':%');
    return old;
  end if;
  if new.birth_date is null and old.birth_date is not null then
    delete from public.items
    where household_id = old.household_id and status = 'open'
      and auto_key like 'birthday:' || old.id || ':%';
  end if;
  if new.wedding_date is null and old.wedding_date is not null then
    delete from public.items
    where household_id = old.household_id and status = 'open'
      and auto_key like 'anniversary:' || old.id || ':%';
  end if;
  return new;
end $$;

create trigger entities_clear_reminders
  before update of birth_date, wedding_date or delete on public.entities
  for each row execute function public.entities_clear_reminders();
