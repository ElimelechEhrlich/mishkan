-- =====================================================================
-- 0012 - An events domain for children and the couple
-- Birthday and anniversary reminders go to the entity's events domain. Children
-- and the couple had none, so their reminders fell into another domain (a
-- child's education). Now every child and the couple open with an events
-- domain, existing ones get it, and open reminders move into it.
-- The app no longer picks another domain when there is no events domain: the
-- reminder waits in "needs completion" instead.
-- Run once in the Supabase SQL editor, after 0011.
-- =====================================================================

-- ---------- New entities: the basic domains of each kind --------------
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
    ('couple',   'אירועים',        'regular',  3)
  ) as d(kind, name, role, sort_order)
  where d.kind = new.kind::text;

  insert into public.domains (household_id, entity_id, name, role, sort_order)
  values (new.household_id, new.id, 'קניות', 'shopping', 100);
  return new;
end $$;

-- ---------- Existing children and couples get one ---------------------
insert into public.domains (household_id, entity_id, name, role, sort_order)
select e.household_id, e.id, 'אירועים', 'regular',
       coalesce((select max(d.sort_order) from public.domains d
                 where d.entity_id = e.id and d.role = 'regular'), 0) + 1
from public.entities e
where e.kind::text in ('child', 'couple')
  and not exists (
    select 1 from public.domains d
    where d.entity_id = e.id and d.role = 'regular' and d.name like '%אירוע%'
  );

-- ---------- Open reminders move to their entity's events domain -------
-- The key is birthday:<entity>:<date> or anniversary:<entity>:<date>.
update public.items i
set domain_id = ev.id
from (
  select distinct on (d.entity_id) d.entity_id, d.id
  from public.domains d
  where d.role = 'regular' and d.name like '%אירוע%'
  order by d.entity_id, d.sort_order
) ev
where i.status = 'open'
  and i.auto_key ~ '^(birthday|anniversary):[0-9a-f-]{36}:'
  and ev.entity_id = split_part(i.auto_key, ':', 2)::uuid
  and i.domain_id is distinct from ev.id;
