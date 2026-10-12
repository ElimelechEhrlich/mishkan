-- =====================================================================
-- 0015 - Family and friends: an entity kept apart from the home
-- A circle entity is shared like any other, but its items stay out of the
-- views of "everything" unless an item is marked to show there (in_main).
-- Every household gets one called "משפחה וחברים", with the domains משפחה and
-- חברים; more circles can be added from the settings, and deleted.
-- Run once in the Supabase SQL editor, after 0014.
-- =====================================================================

-- ---------- An item of a circle can be shown with everything ---------
alter table public.items
  add column if not exists in_main boolean not null default false;

-- ---------- Parents may add and delete circles too ---------------------
drop policy if exists entities_insert on public.entities;
create policy entities_insert on public.entities for insert to authenticated
  with check (
    household_id = public.current_household_id()
    and kind::text in ('parent', 'child', 'circle')
    and member_id is null
  );

drop policy if exists entities_delete on public.entities;
create policy entities_delete on public.entities for delete to authenticated
  using (
    household_id = public.current_household_id()
    and kind::text in ('parent', 'child', 'circle')
    and member_id is null
  );

-- ---------- New entities: the basic domains of each kind ---------------
-- A circle opens with one general domain, and no shopping.
create or replace function public.entities_seed_domains() returns trigger
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
    ('child',    'אירועים',        'regular',  4),
    ('home',     'טכני ותיקונים',  'regular',  1),
    ('home',     'כספים וחובות',   'debts',    2),
    ('home',     'מסמכים',         'regular',  3),
    ('home',     'רכב',            'regular',  4),
    ('home',     'אירועים',        'regular',  5),
    ('couple',   'התפתחות זוגית',  'regular',  1),
    ('couple',   'זמן משותף',      'regular',  2),
    ('couple',   'אירועים',        'regular',  3),
    ('circle',   'כללי',           'regular',  1)
  ) as d(kind, name, role, sort_order)
  where d.kind = new.kind::text;

  if new.kind::text <> 'circle' then
    insert into public.domains (household_id, entity_id, name, role, sort_order)
    values (new.household_id, new.id, 'קניות', 'shopping', 100);
  end if;
  return new;
end $$;

-- ---------- "משפחה וחברים" for a household that has no circle yet ------
create or replace function public.add_family_circle(p_household uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_entity uuid;
begin
  if exists (select 1 from public.entities e
             where e.household_id = p_household and e.kind::text = 'circle') then
    return;
  end if;
  insert into public.entities (household_id, kind, name, sort_order)
  values (p_household, 'circle', 'משפחה וחברים', 100)
  returning id into v_entity;
  update public.domains set name = 'משפחה' where entity_id = v_entity and name = 'כללי';
  insert into public.domains (household_id, entity_id, name, role, sort_order)
  values (p_household, v_entity, 'חברים', 'regular', 2);
end $$;

-- Only the database calls it: when a household is made, and once below.
revoke execute on function public.add_family_circle(uuid) from public, anon, authenticated;

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
  perform public.add_family_circle(v_household);

  return v_household;
end $$;

-- ---------- Existing households ---------------------------------------
select public.add_family_circle(h.id) from public.households h;
