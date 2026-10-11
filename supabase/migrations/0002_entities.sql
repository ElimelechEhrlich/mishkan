-- =====================================================================
-- 0002 - Entities instead of areas (see DATA_MODEL.md)
-- An entity (parent, personal, child, home, couple) holds domains.
-- Privacy is set by the entity: a personal entity is seen by its owner only.
-- No "who performs" field: items.member_id is dropped.
-- Existing items are moved to "needs completion" to be assigned again;
-- their old "area · domain · member" is kept in previous_domain_label as a hint.
-- Run once in the Supabase SQL editor, after 0001.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.entity_kind as enum ('parent', 'personal', 'child', 'home', 'couple');
create type public.domain_role as enum ('regular', 'shopping', 'debts');

-- ---------- Entities -------------------------------------------------
-- member_id: for a personal entity, its owner (required);
-- for a parent entity, the app user it belongs to (null until that parent joins).
create table public.entities (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind         public.entity_kind not null,
  name         text not null check (length(trim(name)) > 0),
  member_id    uuid references public.members(id) on delete cascade,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint entities_personal_has_member check (kind <> 'personal' or member_id is not null),
  constraint entities_member_only_people  check (member_id is null or kind in ('parent', 'personal'))
);
create index entities_household_idx on public.entities (household_id);
create unique index entities_one_home     on public.entities (household_id) where kind = 'home';
create unique index entities_one_couple   on public.entities (household_id) where kind = 'couple';
create unique index entities_one_parent   on public.entities (member_id)    where kind = 'parent';
create unique index entities_one_personal on public.entities (member_id)    where kind = 'personal';

-- ---------- Items: new columns, data moved to "needs completion" -----
-- review_by: the parent whose "needs completion" list shows the item. Defaults to the creator.
alter table public.items
  add column review_by             uuid references public.members(id) on delete set null,
  add column previous_domain_label text;

alter table public.items disable trigger user;

update public.items i
set previous_domain_label = nullif(concat_ws(' · ', a.name, d.name, m.name), ''),
    review_by             = i.created_by,
    domain_id             = null
from public.items src
left join public.domains d on d.id = src.domain_id
left join public.areas   a on a.id = d.area_id
left join public.members m on m.id = src.member_id
where src.id = i.id;

-- a step is completed together with its goal or issue
update public.items s
set review_by = p.review_by
from public.items p
where s.parent_id = p.id;

alter table public.items enable trigger user;

-- "Fully assigned" no longer needs a member.
alter table public.items drop column is_complete;
alter table public.items drop column member_id;
alter table public.items add column is_complete boolean generated always as (
  case
    when kind in ('note', 'debt', 'issue') then domain_id is not null
    else domain_id is not null and time_mode is not null
  end
) stored;
create index items_review_idx on public.items (review_by) where not is_complete;

-- ---------- Drop the areas model -------------------------------------
drop policy items_all         on public.items;
drop policy domains_all       on public.domains;
drop policy areas_all         on public.areas;
drop policy debt_details_all  on public.debt_details;
drop policy prerequisites_all on public.prerequisites;
drop policy completions_all   on public.completions;
drop policy attachments_all   on public.attachments;
drop policy item_attachments_all on storage.objects;

drop trigger members_create_personal_area on public.members;
drop trigger domains_before_write          on public.domains;
drop trigger areas_cascade_visibility      on public.areas;
drop function public.members_create_personal_area();
drop function public.domains_before_write();
drop function public.areas_cascade_visibility();
drop function public.can_see_item(uuid);
drop function public.can_see_domain(uuid);

delete from public.domains;
alter table public.domains
  drop column area_id,
  drop column visibility,
  drop column owner_id,
  add column entity_id uuid not null references public.entities(id) on delete cascade,
  add column role      public.domain_role not null default 'regular';
drop table public.areas;
drop type public.domain_visibility;

create index domains_entity_idx on public.domains (entity_id);
-- one shopping domain and at most one debts domain per entity
create unique index domains_one_special_per_entity on public.domains (entity_id, role) where role <> 'regular';

-- ---------- Triggers: entities ---------------------------------------
-- kind, owner and household of an entity never change after creation.
-- The one exception: join_household() lets a joining parent claim an unclaimed parent entity.
create function public.entities_lock_identity() returns trigger
language plpgsql as $$
begin
  new.kind         := old.kind;
  new.household_id := old.household_id;
  if not (
    coalesce(current_setting('mishkan.claim_parent', true), '') = 'on'
    and old.kind = 'parent'
    and old.member_id is null
  ) then
    new.member_id := old.member_id;
  end if;
  return new;
end $$;

create trigger entities_lock_identity
  before update on public.entities
  for each row execute function public.entities_lock_identity();

-- Every entity opens with the basic domains of its kind, plus shopping.
create function public.entities_seed_domains() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.domains (household_id, entity_id, name, role, sort_order)
  select new.household_id, new.id, d.name, d.role::public.domain_role, d.sort_order
  from (values
    ('parent',   'בריאות',         'regular',  1),
    ('parent',   'אירועים',        'regular',  2),
    ('personal', 'התפתחות אישית',  'regular',  1),
    ('personal', 'הפתעות',         'regular',  2),
    ('child',    'חינוך',          'regular',  1),
    ('child',    'בריאות',         'regular',  2),
    ('child',    'התפתחות',        'regular',  3),
    ('home',     'טכני ותיקונים',  'regular',  1),
    ('home',     'כספים וחובות',   'debts',    2),
    ('home',     'מסמכים',         'regular',  3),
    ('home',     'רכב',            'regular',  4),
    ('home',     'אירועים',        'regular',  5),
    ('couple',   'התפתחות זוגית',  'regular',  1),
    ('couple',   'זמן משותף',      'regular',  2)
  ) as d(kind, name, role, sort_order)
  where d.kind = new.kind::text;

  insert into public.domains (household_id, entity_id, name, role, sort_order)
  values (new.household_id, new.id, 'קניות', 'shopping', 100);
  return new;
end $$;

create trigger entities_seed_domains
  after insert on public.entities
  for each row execute function public.entities_seed_domains();

-- ---------- Triggers: domains ----------------------------------------
-- A domain takes its household from its entity and never moves to another entity.
-- A child never has a debts domain.
create function public.domains_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_entity public.entities%rowtype;
begin
  if tg_op = 'UPDATE' then
    new.entity_id := old.entity_id;
  end if;
  select * into v_entity from public.entities where id = new.entity_id;
  if not found then
    raise exception 'entity not found';
  end if;
  new.household_id := v_entity.household_id;
  if new.role = 'debts' and v_entity.kind = 'child' then
    raise exception 'a child cannot have a debts domain';
  end if;
  return new;
end $$;

create trigger domains_before_write
  before insert or update on public.domains
  for each row execute function public.domains_before_write();

-- The shopping domain stays as long as its entity exists.
create function public.domains_keep_shopping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'shopping' and exists (select 1 from public.entities e where e.id = old.entity_id) then
    raise exception 'the shopping domain cannot be deleted';
  end if;
  return old;
end $$;

create trigger domains_keep_shopping
  before delete on public.domains
  for each row execute function public.domains_keep_shopping();

-- ---------- Triggers: items ------------------------------------------
create or replace function public.items_before_write() returns trigger
language plpgsql as $$
declare
  v_parent public.items%rowtype;
begin
  if tg_op = 'INSERT' then
    new.household_id := coalesce(new.household_id, public.current_household_id());
    new.created_by   := coalesce(new.created_by, public.current_member_id());
    new.review_by    := coalesce(new.review_by, new.created_by);
  else
    new.household_id := old.household_id;
    new.created_by   := old.created_by;
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

  -- once assigned, the hint from the old structure is no longer needed
  if new.domain_id is not null then
    new.previous_domain_label := null;
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

-- When a goal / issue moves to another domain, its steps follow,
-- and when it becomes unassigned they wait in the same parent's "needs completion".
create or replace function public.items_cascade_domain() returns trigger
language plpgsql as $$
begin
  update public.items
  set domain_id = new.domain_id,
      review_by = new.review_by
  where parent_id = new.id;
  return null;
end $$;

-- ---------- Visibility helpers (used by RLS) -------------------------
create function public.can_see_entity(p_entity_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entities e
    where e.id = p_entity_id
      and e.household_id = public.current_household_id()
      and (e.kind <> 'personal' or e.member_id = public.current_member_id())
  )
$$;

create function public.can_see_domain(p_domain_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.domains d
    where d.id = p_domain_id
      and public.can_see_entity(d.entity_id)
  )
$$;

-- Unassigned items are visible to the parent who has to complete them only.
create function public.can_see_item(p_item_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.household_id = public.current_household_id()
      and (
        (i.domain_id is null and i.review_by = public.current_member_id())
        or (i.domain_id is not null and public.can_see_domain(i.domain_id))
      )
  )
$$;

-- ---------- Deleting a domain or an entity ---------------------------
-- Items are never deleted with them: they move to "needs completion" of the
-- parent who deleted, with the old place kept as a hint.
create function public.delete_domain(p_domain_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_label text;
begin
  select concat_ws(' · ', e.name, d.name) into v_label
  from public.domains d
  join public.entities e on e.id = d.entity_id
  where d.id = p_domain_id;
  if v_label is null then
    raise exception 'domain not found';
  end if;

  update public.items
  set domain_id = null,
      review_by = public.current_member_id(),
      previous_domain_label = v_label
  where domain_id = p_domain_id and parent_id is null;

  delete from public.domains where id = p_domain_id;
end $$;

create function public.delete_entity(p_entity_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_name text;
begin
  select e.name into v_name from public.entities e where e.id = p_entity_id;
  if v_name is null then
    raise exception 'entity not found';
  end if;

  update public.items i
  set domain_id = null,
      review_by = public.current_member_id(),
      previous_domain_label = concat_ws(' · ', v_name, d.name)
  from public.domains d
  where d.id = i.domain_id and d.entity_id = p_entity_id and i.parent_id is null;

  delete from public.entities where id = p_entity_id;
end $$;

-- ---------- Entities for existing households -------------------------
insert into public.entities (household_id, kind, name, sort_order)
select h.id, 'home'::public.entity_kind, 'הבית', 1 from public.households h;

insert into public.entities (household_id, kind, name, sort_order)
select h.id, 'couple'::public.entity_kind, 'זוגי', 2 from public.households h;

insert into public.entities (household_id, kind, name, member_id, sort_order)
select m.household_id, 'parent'::public.entity_kind, m.name, m.id, 3
from public.members m where m.role = 'parent';

insert into public.entities (household_id, kind, name, member_id, sort_order)
select m.household_id, 'personal'::public.entity_kind, 'אישי', m.id, 0
from public.members m where m.role = 'parent';

insert into public.entities (household_id, kind, name, sort_order)
select m.household_id, 'child'::public.entity_kind, m.name, 4
from public.members m where m.role = 'child';

-- Members are now only the parents who sign in.
drop policy members_insert_children on public.members;
drop policy members_delete_children on public.members;
delete from public.members where role <> 'parent';
alter table public.members add constraint members_parents_only check (role = 'parent');

-- ---------- Onboarding -----------------------------------------------
-- First parent: household, the single home and couple entities, and the parent's own entities.
create or replace function public.create_household(p_household_name text, p_parent_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := (select auth.uid());
  v_household uuid;
  v_member    uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.members m where m.user_id = v_user) then
    raise exception 'user already belongs to a household';
  end if;

  insert into public.households (name) values (p_household_name) returning id into v_household;
  insert into public.members (household_id, name, role, user_id)
  values (v_household, p_parent_name, 'parent', v_user)
  returning id into v_member;

  insert into public.entities (household_id, kind, name, member_id, sort_order) values
    (v_household, 'personal', 'אישי',         v_member, 0),
    (v_household, 'home',     'הבית',          null,     1),
    (v_household, 'couple',   'זוגי',          null,     2),
    (v_household, 'parent',   p_parent_name,   v_member, 3);

  return v_household;
end $$;

-- Parent entities that no one has joined as yet, for the join screen.
create function public.unclaimed_parents(p_invite_code uuid)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.name
  from public.entities e
  join public.households h on h.id = e.household_id
  where h.invite_code = p_invite_code
    and e.kind = 'parent'
    and e.member_id is null
  order by e.created_at
$$;

-- Second parent: joins with the invite code, either as an existing parent entity
-- (created before they joined) or as a new one, and gets a personal entity.
drop function public.join_household(uuid, text);
create function public.join_household(
  p_invite_code      uuid,
  p_parent_name      text,
  p_parent_entity_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := (select auth.uid());
  v_household uuid;
  v_member    uuid;
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

  insert into public.members (household_id, name, role, user_id)
  values (v_household, p_parent_name, 'parent', v_user)
  returning id into v_member;

  if p_parent_entity_id is null then
    insert into public.entities (household_id, kind, name, member_id, sort_order)
    values (v_household, 'parent', p_parent_name, v_member, 3);
  else
    -- member_id is locked for ordinary updates; this flag lets the claim through
    perform set_config('mishkan.claim_parent', 'on', true);
    update public.entities
    set member_id = v_member
    where id = p_parent_entity_id
      and household_id = v_household
      and kind = 'parent'
      and member_id is null;
    if not found then
      raise exception 'parent entity not available';
    end if;
    perform set_config('mishkan.claim_parent', 'off', true);
  end if;

  insert into public.entities (household_id, kind, name, member_id, sort_order)
  values (v_household, 'personal', 'אישי', v_member, 0);

  return v_household;
end $$;

-- ---------- Row Level Security ---------------------------------------
alter table public.entities enable row level security;

-- entities: home, couple and children are created by the system or by hand;
-- personal ones only by onboarding. A parent who has joined cannot be deleted.
create policy entities_select on public.entities for select to authenticated
  using (public.can_see_entity(id));
create policy entities_insert on public.entities for insert to authenticated
  with check (
    household_id = public.current_household_id()
    and kind in ('parent', 'child')
    and member_id is null
  );
create policy entities_update on public.entities for update to authenticated
  using (public.can_see_entity(id))
  with check (household_id = public.current_household_id());
create policy entities_delete on public.entities for delete to authenticated
  using (
    household_id = public.current_household_id()
    and kind in ('parent', 'child')
    and member_id is null
  );

-- domains: follow their entity
create policy domains_all on public.domains for all to authenticated
  using (household_id = public.current_household_id() and public.can_see_entity(entity_id))
  with check (household_id = public.current_household_id() and public.can_see_entity(entity_id));

-- items: visibility follows the domain; unassigned items belong to their reviewer
create policy items_all on public.items for all to authenticated
  using (
    household_id = public.current_household_id()
    and (
      (domain_id is null and review_by = public.current_member_id())
      or (domain_id is not null and public.can_see_domain(domain_id))
    )
  )
  with check (
    household_id = public.current_household_id()
    and (
      (domain_id is null and review_by = public.current_member_id())
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

create policy item_attachments_all on storage.objects for all to authenticated
  using (
    bucket_id = 'item-attachments'
    and public.can_see_item(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'item-attachments'
    and public.can_see_item(((storage.foldername(name))[2])::uuid)
  );

-- ---------- Grants ---------------------------------------------------
grant select, insert, update, delete on public.entities to authenticated;
