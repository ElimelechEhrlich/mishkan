-- =====================================================================
-- Home management app - full schema for a fresh Supabase project
-- Tables, triggers, RLS, onboarding functions, storage, realtime
-- Run once in the Supabase SQL editor.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.member_role       as enum ('parent', 'child', 'household');
create type public.domain_visibility as enum ('household', 'private');
create type public.item_kind         as enum ('task', 'goal', 'issue', 'note', 'debt');
create type public.item_time_mode    as enum ('scheduled', 'recurring', 'anytime', 'waiting', 'someday');
create type public.item_status       as enum ('open', 'done');
create type public.debt_direction    as enum ('we_owe', 'owed_to_us');

-- ---------- Tables ---------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code uuid not null unique default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

-- Parents, children, and one "the house" row per household.
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  color        text,
  role         public.member_role not null,
  user_id      uuid unique references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint members_only_parents_have_users check (role = 'parent' or user_id is null)
);
create unique index members_one_household_row on public.members (household_id) where role = 'household';
create index members_household_idx on public.members (household_id);

-- Top-level areas (kids, personal, home, couple).
-- A private area makes every domain under it private.
create table public.areas (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   integer not null default 0,
  visibility   public.domain_visibility not null default 'household',
  owner_id     uuid references public.members(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint areas_private_has_owner check ((visibility = 'private') = (owner_id is not null))
);
create index areas_household_idx on public.areas (household_id);

-- Domains live under an area. Inside a shared area a single domain can still be private.
create table public.domains (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  area_id      uuid not null references public.areas(id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   integer not null default 0,
  visibility   public.domain_visibility not null default 'household',
  owner_id     uuid references public.members(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint domains_private_has_owner check ((visibility = 'private') = (owner_id is not null))
);
create index domains_household_idx on public.domains (household_id);
create index domains_area_idx      on public.domains (area_id);

-- The central table. Only title is required at capture time.
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  notes           text,
  kind            public.item_kind not null default 'task',
  domain_id       uuid references public.domains(id) on delete restrict,   -- null = not assigned yet
  member_id       uuid references public.members(id) on delete set null,   -- null = not assigned yet
  parent_id       uuid references public.items(id) on delete cascade,      -- step of a goal / issue
  time_mode       public.item_time_mode,                                   -- null = not defined yet
  due_date        date,
  remind_at       timestamptz,
  recurrence_rule text,                                                    -- iCal RRULE string
  status          public.item_status not null default 'open',
  created_by      uuid not null references public.members(id),
  completed_by    uuid references public.members(id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  -- "fully assigned" rule, per kind
  is_complete     boolean generated always as (
    case
      when kind in ('note', 'debt') then domain_id is not null
      else domain_id is not null and member_id is not null and time_mode is not null
    end
  ) stored,
  constraint items_scheduled_needs_date check (time_mode is distinct from 'scheduled' or due_date is not null),
  constraint items_recurring_needs_rule check (time_mode is distinct from 'recurring' or recurrence_rule is not null),
  constraint items_not_own_parent       check (parent_id is null or parent_id <> id)
);
create index items_household_status_idx on public.items (household_id, status);
create index items_parent_idx           on public.items (parent_id);
create index items_domain_idx           on public.items (domain_id);
create index items_member_idx           on public.items (member_id);
create index items_due_open_idx         on public.items (due_date) where status = 'open';
create index items_incomplete_idx       on public.items (created_by) where not is_complete;

-- One row per item of kind 'debt'. "Closed" = items.status = 'done'.
create table public.debt_details (
  item_id      uuid primary key references public.items(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  counterparty text not null,
  direction    public.debt_direction not null
);

-- Either a dependency on another item, or a free-text condition ticked by hand.
create table public.prerequisites (
  id                 uuid primary key default gen_random_uuid(),
  item_id            uuid not null references public.items(id) on delete cascade,
  depends_on_item_id uuid references public.items(id) on delete cascade,
  description        text,
  is_met             boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint prerequisites_one_kind check (num_nonnulls(depends_on_item_id, description) = 1),
  constraint prerequisites_not_self check (depends_on_item_id is null or depends_on_item_id <> item_id)
);
create index prerequisites_item_idx       on public.prerequisites (item_id);
create index prerequisites_depends_on_idx on public.prerequisites (depends_on_item_id);

-- ---------- Helper functions (used by RLS) ---------------------------
create function public.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members m where m.user_id = (select auth.uid())
$$;

create function public.current_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.household_id from public.members m where m.user_id = (select auth.uid())
$$;

create function public.can_see_domain(p_domain_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.domains d
    where d.id = p_domain_id
      and d.household_id = public.current_household_id()
      and (d.visibility = 'household' or d.owner_id = public.current_member_id())
  )
$$;

-- Unassigned items are visible to their creator only.
create function public.can_see_item(p_item_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.household_id = public.current_household_id()
      and (
        (i.domain_id is null and i.created_by = public.current_member_id())
        or (i.domain_id is not null and public.can_see_domain(i.domain_id))
      )
  )
$$;

-- History of completions (for recurring items).
create table public.completions (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  completed_by uuid default public.current_member_id() references public.members(id) on delete set null,
  completed_at timestamptz not null default now()
);
create index completions_item_idx on public.completions (item_id, completed_at desc);

-- Files exist only as attachments of an item.
-- Storage path convention: {household_id}/{item_id}/{file_name}
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  created_at   timestamptz not null default now()
);
create index attachments_item_idx on public.attachments (item_id);

-- ---------- Triggers: members ----------------------------------------
-- role / user / household of a member never change after creation.
create function public.members_lock_identity() returns trigger
language plpgsql as $$
begin
  new.role         := old.role;
  new.user_id      := old.user_id;
  new.household_id := old.household_id;
  return new;
end $$;

create trigger members_lock_identity
  before update on public.members
  for each row execute function public.members_lock_identity();

-- Every parent gets a private personal area with its default domains.
create function public.members_create_personal_area() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_area uuid;
begin
  insert into public.areas (household_id, name, sort_order, visibility, owner_id)
  values (new.household_id, 'אישי', 2, 'private', new.id)
  returning id into v_area;

  insert into public.domains (household_id, area_id, name, sort_order) values
    (new.household_id, v_area, 'התפתחות אישית', 1),
    (new.household_id, v_area, 'בריאות',        2),
    (new.household_id, v_area, 'עבודה',         3);
  return new;
end $$;

create trigger members_create_personal_area
  after insert on public.members
  for each row when (new.role = 'parent')
  execute function public.members_create_personal_area();

-- ---------- Triggers: areas and domains ------------------------------
-- A domain takes its household from its area; inside a private area it is always private.
create function public.domains_before_write() returns trigger
language plpgsql as $$
declare
  v_area public.areas%rowtype;
begin
  select * into v_area from public.areas where id = new.area_id;
  if not found then
    raise exception 'area not found';
  end if;
  new.household_id := v_area.household_id;
  if v_area.visibility = 'private' then
    new.visibility := 'private';
    new.owner_id   := v_area.owner_id;
  end if;
  return new;
end $$;

create trigger domains_before_write
  before insert or update on public.domains
  for each row execute function public.domains_before_write();

-- Changing an area's privacy flows down to its domains.
create function public.areas_cascade_visibility() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility = 'private' then
    if exists (
      select 1 from public.domains d
      where d.area_id = new.id and d.visibility = 'private' and d.owner_id <> new.owner_id
    ) then
      raise exception 'area contains a private domain of another member';
    end if;
    update public.domains set visibility = 'private', owner_id = new.owner_id where area_id = new.id;
  else
    update public.domains set visibility = 'household', owner_id = null
    where area_id = new.id and owner_id = old.owner_id;
  end if;
  return null;
end $$;

create trigger areas_cascade_visibility
  after update of visibility, owner_id on public.areas
  for each row
  when (old.visibility is distinct from new.visibility or old.owner_id is distinct from new.owner_id)
  execute function public.areas_cascade_visibility();

-- ---------- Triggers: items ------------------------------------------
create function public.items_before_write() returns trigger
language plpgsql as $$
declare
  v_parent public.items%rowtype;
begin
  if tg_op = 'INSERT' then
    new.household_id := coalesce(new.household_id, public.current_household_id());
    new.created_by   := coalesce(new.created_by, public.current_member_id());
  else
    new.household_id := old.household_id;
    new.created_by   := old.created_by;
  end if;

  -- assignee must belong to the same household
  if new.member_id is not null and not exists (
    select 1 from public.members m
    where m.id = new.member_id and m.household_id = new.household_id
  ) then
    raise exception 'member does not belong to this household';
  end if;

  -- steps: two levels only, parent is a goal or an issue, step inherits the domain
  if new.parent_id is not null then
    select * into v_parent from public.items where id = new.parent_id;
    if not found then
      raise exception 'parent item not found';
    end if;
    if v_parent.household_id <> new.household_id then
      raise exception 'parent item belongs to another household';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'only two levels are allowed: a step cannot have steps';
    end if;
    if v_parent.kind not in ('goal', 'issue') then
      raise exception 'only a goal or an issue can have steps';
    end if;
    if new.kind <> 'task' then
      raise exception 'a step must be a task';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.items c where c.parent_id = new.id) then
      raise exception 'an item that has steps cannot become a step';
    end if;
    new.domain_id := v_parent.domain_id;
  end if;

  -- a container cannot change kind while it has steps
  if tg_op = 'UPDATE' and new.kind not in ('goal', 'issue')
     and old.kind in ('goal', 'issue')
     and exists (select 1 from public.items c where c.parent_id = new.id) then
    raise exception 'cannot change kind while the item has steps';
  end if;

  -- completion bookkeeping
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.completed_by := coalesce(new.completed_by, public.current_member_id());
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end $$;

create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- When a goal / issue moves to another domain, its steps follow.
create function public.items_cascade_domain() returns trigger
language plpgsql as $$
begin
  update public.items set domain_id = new.domain_id where parent_id = new.id;
  return null;
end $$;

create trigger items_cascade_domain
  after update of domain_id on public.items
  for each row when (old.domain_id is distinct from new.domain_id)
  execute function public.items_cascade_domain();

-- ---------- Waiting items: release when all prerequisites are met ----
-- A released item gets time_mode = null, so it shows up in "needs completion"
-- and asks for a time to be set.
create function public.refresh_waiting(p_item_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.items i
  set time_mode = null
  where i.id = p_item_id
    and i.time_mode = 'waiting'
    and exists (select 1 from public.prerequisites p where p.item_id = i.id)
    and not exists (
      select 1
      from public.prerequisites p
      left join public.items d on d.id = p.depends_on_item_id
      where p.item_id = i.id
        and (
          (p.depends_on_item_id is null and not p.is_met)
          or (p.depends_on_item_id is not null and d.status <> 'done')
        )
    )
$$;

create function public.prerequisites_after_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_waiting(old.item_id);
  else
    perform public.refresh_waiting(new.item_id);
  end if;
  return null;
end $$;

create trigger prerequisites_after_write
  after insert or update or delete on public.prerequisites
  for each row execute function public.prerequisites_after_write();

create function public.items_release_dependents() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_waiting(p.item_id)
  from public.prerequisites p
  where p.depends_on_item_id = new.id;
  return null;
end $$;

create trigger items_release_dependents
  after update of status on public.items
  for each row when (old.status is distinct from new.status)
  execute function public.items_release_dependents();

-- ---------- Onboarding -----------------------------------------------
-- First parent: creates the household, the "house" member, and default domains.
create function public.create_household(p_household_name text, p_parent_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := (select auth.uid());
  v_household uuid;
  v_kids      uuid;
  v_home      uuid;
  v_couple    uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.members m where m.user_id = v_user) then
    raise exception 'user already belongs to a household';
  end if;

  insert into public.households (name) values (p_household_name) returning id into v_household;

  insert into public.members (household_id, name, role) values (v_household, 'הבית', 'household');
  -- the parent row also creates the private "personal" area (sort_order 2) via trigger
  insert into public.members (household_id, name, role, user_id) values (v_household, p_parent_name, 'parent', v_user);

  insert into public.areas (household_id, name, sort_order) values (v_household, 'ילדים', 1) returning id into v_kids;
  insert into public.areas (household_id, name, sort_order) values (v_household, 'בית',   3) returning id into v_home;
  insert into public.areas (household_id, name, sort_order) values (v_household, 'זוגי',  4) returning id into v_couple;

  insert into public.domains (household_id, area_id, name, sort_order) values
    (v_household, v_kids,   'חינוך',             1),
    (v_household, v_kids,   'התפתחות',           2),
    (v_household, v_kids,   'לימודים',           3),
    (v_household, v_kids,   'בריאות',            4),
    (v_household, v_kids,   'נפשי/רגשי',         5),
    (v_household, v_home,   'טכני ותיקונים',     1),
    (v_household, v_home,   'כספים וחובות',      2),
    (v_household, v_home,   'מסמכים ובירוקרטיה', 3),
    (v_household, v_home,   'רכב',               4),
    (v_household, v_home,   'אירועים/שמחות',     5),
    (v_household, v_home,   'רכישות',            6),
    (v_household, v_couple, 'התפתחות זוגית',     1),
    (v_household, v_couple, 'זמן משותף',         2);

  return v_household;
end $$;

-- Second parent: joins with the household's invite code.
create function public.join_household(p_invite_code uuid, p_parent_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := (select auth.uid());
  v_household uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.members m where m.user_id = v_user) then
    raise exception 'user already belongs to a household';
  end if;

  select h.id into v_household from public.households h where h.invite_code = p_invite_code;
  if v_household is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.members (household_id, name, role, user_id) values (v_household, p_parent_name, 'parent', v_user);
  return v_household;
end $$;

-- ---------- Row Level Security ---------------------------------------
alter table public.households    enable row level security;
alter table public.members       enable row level security;
alter table public.areas         enable row level security;
alter table public.domains       enable row level security;
alter table public.items         enable row level security;
alter table public.debt_details  enable row level security;
alter table public.prerequisites enable row level security;
alter table public.completions   enable row level security;
alter table public.attachments   enable row level security;

-- households: created only through create_household()
create policy households_select on public.households for select to authenticated
  using (id = public.current_household_id());
create policy households_update on public.households for update to authenticated
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

-- members: parents join only through the onboarding functions
create policy members_select on public.members for select to authenticated
  using (household_id = public.current_household_id());
create policy members_insert_children on public.members for insert to authenticated
  with check (household_id = public.current_household_id() and role = 'child' and user_id is null);
create policy members_update on public.members for update to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
create policy members_delete_children on public.members for delete to authenticated
  using (household_id = public.current_household_id() and role = 'child');

-- areas: shared ones for the household, private ones for their owner
create policy areas_all on public.areas for all to authenticated
  using (
    household_id = public.current_household_id()
    and (visibility = 'household' or owner_id = public.current_member_id())
  )
  with check (
    household_id = public.current_household_id()
    and (visibility = 'household' or owner_id = public.current_member_id())
  );

-- domains: shared ones for the household, private ones for their owner
create policy domains_all on public.domains for all to authenticated
  using (
    household_id = public.current_household_id()
    and (visibility = 'household' or owner_id = public.current_member_id())
  )
  with check (
    household_id = public.current_household_id()
    and (visibility = 'household' or owner_id = public.current_member_id())
  );

-- items: visibility follows the domain; unassigned items belong to their creator
create policy items_all on public.items for all to authenticated
  using (
    household_id = public.current_household_id()
    and (
      (domain_id is null and created_by = public.current_member_id())
      or (domain_id is not null and public.can_see_domain(domain_id))
    )
  )
  with check (
    household_id = public.current_household_id()
    and (
      (domain_id is null and created_by = public.current_member_id())
      or (domain_id is not null and public.can_see_domain(domain_id))
    )
  );

-- child tables: follow the item
create policy debt_details_all on public.debt_details for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

create policy prerequisites_all on public.prerequisites for all to authenticated
  using (public.can_see_item(item_id))
  with check (
    public.can_see_item(item_id)
    and (depends_on_item_id is null or public.can_see_item(depends_on_item_id))
  );

create policy completions_all on public.completions for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

create policy attachments_all on public.attachments for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

-- ---------- Grants ---------------------------------------------------
grant select, update on public.households to authenticated;
grant select, insert, update, delete on
  public.members, public.areas, public.domains, public.items, public.debt_details,
  public.prerequisites, public.completions, public.attachments
  to authenticated;

-- ---------- Storage: item attachments --------------------------------
insert into storage.buckets (id, name, public)
values ('item-attachments', 'item-attachments', false)
on conflict (id) do nothing;

create policy item_attachments_all on storage.objects for all to authenticated
  using (
    bucket_id = 'item-attachments'
    and public.can_see_item(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'item-attachments'
    and public.can_see_item(((storage.foldername(name))[2])::uuid)
  );

-- ---------- Realtime -------------------------------------------------
alter publication supabase_realtime add table public.items;
