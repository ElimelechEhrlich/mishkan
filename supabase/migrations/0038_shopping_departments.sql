-- =====================================================================
-- 0038 - The supermarket's departments, in the order the household walks them
-- A run of the "סופר" kind is shown by department, in the household's order,
-- so the shop is walked once from the door to the till. Each household has
-- its own list of departments: they can be renamed, deleted, added and moved,
-- and the order is kept for every run after. Which department an item is in
-- comes from a built-in dictionary in the app, and from what the household
-- chose for an item before, kept here by its name.
-- The kind "מזון" is now called "סופר" (the run's title only; the value stays).
-- Run once in the Supabase SQL editor, after 0037.
-- =====================================================================

create table public.shopping_departments (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  -- The built-in department it started as, so the dictionary still finds it once renamed.
  key          text,
  -- Where it stands in the walk through the shop.
  position     double precision not null default extract(epoch from clock_timestamp()),
  created_at   timestamptz not null default now()
);
create index shopping_departments_household_idx
  on public.shopping_departments (household_id, position);

alter table public.shopping_departments enable row level security;

create policy shopping_departments_all on public.shopping_departments for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

grant select, insert, update, delete on public.shopping_departments to authenticated;

-- The department chosen for an item, by the item's name, so the next time it comes alone.
-- Deleting a department forgets what was put in it.
create table public.shopping_item_departments (
  household_id  uuid not null default public.current_household_id()
                references public.households(id) on delete cascade,
  -- The item's name, trimmed and in lower case.
  title_key     text not null check (length(title_key) > 0),
  department_id uuid not null references public.shopping_departments(id) on delete cascade,
  primary key (household_id, title_key)
);

alter table public.shopping_item_departments enable row level security;

create policy shopping_item_departments_all on public.shopping_item_departments
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (
    household_id = public.current_household_id()
    and exists (
      select 1 from public.shopping_departments d
      where d.id = department_id and d.household_id = public.current_household_id()
    )
  );

grant select, insert, update, delete on public.shopping_item_departments to authenticated;

-- ---------- The departments a household starts with ------------------
create function public.seed_shopping_departments(p_household uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.shopping_departments (household_id, name, key, position)
  select p_household, d.name, d.key, d.position
  from (values
    ('produce',  'ירקות ופירות',      1),
    ('bakery',   'לחם ומאפים',        2),
    ('dairy',    'חלב וביצים',        3),
    ('meat',     'בשר, עוף ודגים',    4),
    ('frozen',   'קפואים',            5),
    ('dry',      'יבשים ושימורים',    6),
    ('drinks',   'משקאות',            7),
    ('snacks',   'חטיפים ומתוקים',    8),
    ('cleaning', 'ניקיון',            9),
    ('hygiene',  'טיפוח והיגיינה',   10),
    ('baby',     'תינוקות',          11)
  ) as d(key, name, position);
$$;

create function public.households_seed_departments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_shopping_departments(new.id);
  return new;
end $$;

create trigger households_seed_departments
  after insert on public.households
  for each row execute function public.households_seed_departments();

select public.seed_shopping_departments(h.id) from public.households h;

-- ---------- Setting the order in one step ------------------------------
-- The departments in their new order, as moved by dragging.
create function public.order_shopping_departments(p_ids uuid[]) returns void
language sql set search_path = '' as $$
  update public.shopping_departments d
  set position = o.place
  from unnest(p_ids) with ordinality as o(id, place)
  where d.id = o.id and d.household_id = public.current_household_id();
$$;

grant execute on function public.order_shopping_departments(uuid[]) to authenticated;

-- ---------- "מזון" is now "סופר" --------------------------------------
create or replace function public.create_shopping_run(
  p_category public.shopping_category,
  p_private  boolean
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_member uuid := public.current_member_id();
  v_domain uuid;
  v_run    uuid;
begin
  select d.id into v_domain
  from public.domains d
  join public.entities e on e.id = d.entity_id
  where d.role = 'shopping'
    and e.household_id = public.current_household_id()
    and (
      (p_private and e.kind = 'personal' and e.member_id = v_member)
      or (not p_private and e.kind = 'home')
    );
  if v_domain is null then
    raise exception 'shopping domain not found';
  end if;

  insert into public.items (title, kind, domain_id)
  values (
    'סבב קניות · ' || case p_category
      when 'food'     then 'סופר'
      when 'clothing' then 'ביגוד'
      when 'urgent'   then 'דחוף'
      when 'planned'  then 'מתוכננת'
    end,
    'shopping_run',
    v_domain
  )
  returning id into v_run;

  update public.items i
  set run_id = v_run
  from public.domains d
  join public.entities e on e.id = d.entity_id
  where d.id = i.domain_id
    and i.kind = 'missing_item'
    and i.status = 'open'
    and i.run_id is null
    and i.shopping_category = p_category
    and (
      (p_private and e.kind = 'personal' and e.member_id = v_member)
      or (not p_private and e.kind <> 'personal')
    );
  if not found then
    raise exception 'no missing items in this category';
  end if;

  return v_run;
end $$;

-- Runs still open keep their place in the list, under the new name.
update public.items
set title = 'סבב קניות · סופר'
where kind = 'shopping_run' and status = 'open' and title = 'סבב קניות · מזון';
