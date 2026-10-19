-- =====================================================================
-- 0045 - Debts: importance, payments and a monthly plan
-- A debt is marked important ("חשוב") or not ("יכול לחכות", the default).
-- Payments are recorded against it (an amount, a day, a note), and what is
-- left is its amount less what was paid. A monthly plan ("הסדר תשלומים") is a
-- sum due on a day of each month: the debt then stands on that day in the
-- lists, like a task, and ticking it records that month's payment. The day it
-- stands on is the first month of the plan not paid yet, kept by the database;
-- once nothing is left, it stands on no day, and its page asks to close it.
-- Run once in the Supabase SQL editor, after 0044.
-- =====================================================================

alter table public.debt_details
  add column important      boolean not null default false,
  add column monthly_amount numeric(12,2) check (monthly_amount > 0),
  add column monthly_day    smallint check (monthly_day between 1 and 28),
  add column plan_starts    date,
  add constraint debt_plan_whole check (
    (monthly_amount is null) = (monthly_day is null)
    and (monthly_amount is null) = (plan_starts is null)
  );

create table public.debt_payments (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  paid_on      date not null default public.today_in_israel(),
  -- The month of the plan it pays (its first day); null for a payment outside the plan.
  for_month    date,
  note         text,
  created_by   uuid default public.current_member_id()
               references public.members(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index debt_payments_item_idx on public.debt_payments (item_id, paid_on);
-- A month of the plan is paid once.
create unique index debt_payments_month_idx on public.debt_payments (item_id, for_month)
  where for_month is not null;

alter table public.debt_payments enable row level security;

create policy debt_payments_all on public.debt_payments for all to authenticated
  using (public.can_see_item(item_id))
  with check (
    public.can_see_item(item_id)
    and household_id = public.current_household_id()
    and exists (select 1 from public.items i where i.id = item_id and i.kind = 'debt')
  );

grant select, insert, update, delete on public.debt_payments to authenticated;

-- How much was paid of each debt, as the parent may see it.
create view public.debt_paid
with (security_invoker = true) as
select p.item_id, sum(p.amount)::numeric(12,2) as paid
from public.debt_payments p
group by p.item_id;

grant select on public.debt_paid to authenticated;

-- The day of the plan in a month: its first day, moved to the plan's day.
create function public.debt_plan_day(p_month date, p_day smallint) returns date
language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_month)::date + (p_day - 1))
$$;

-- Where a debt stands: on the first month of its plan not paid yet, or on no day once
-- there is no plan or nothing is left.
create function public.sync_debt_due(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_debt  public.debt_details%rowtype;
  v_paid  numeric;
  v_month date;
begin
  select * into v_debt from public.debt_details where item_id = p_item_id;
  select coalesce(sum(amount), 0) into v_paid from public.debt_payments where item_id = p_item_id;
  if v_debt.item_id is null or v_debt.monthly_amount is null or v_paid >= v_debt.amount then
    update public.items set due_date = null, time_mode = null
    where id = p_item_id and kind = 'debt' and due_date is not null;
    return;
  end if;
  v_month := date_trunc('month', v_debt.plan_starts)::date;
  while exists (select 1 from public.debt_payments
                where item_id = p_item_id and for_month = v_month) loop
    v_month := (v_month + interval '1 month')::date;
  end loop;
  update public.items
  set due_date = public.debt_plan_day(v_month, v_debt.monthly_day), time_mode = 'scheduled'
  where id = p_item_id and kind = 'debt'
    and due_date is distinct from public.debt_plan_day(v_month, v_debt.monthly_day);
end $$;

create function public.debt_payments_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.sync_debt_due(coalesce(new.item_id, old.item_id));
  return null;
end $$;

create trigger debt_payments_sync
  after insert or update or delete on public.debt_payments
  for each row execute function public.debt_payments_sync();

create function public.debt_details_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.sync_debt_due(new.item_id);
  return null;
end $$;

create trigger debt_details_sync
  after insert or update of amount, monthly_amount, monthly_day, plan_starts
  on public.debt_details
  for each row execute function public.debt_details_sync();

-- Ticks this month of the plan: its payment, of the plan's sum, on the day it is ticked.
-- Returns the payment's id, so it can be taken back.
create function public.pay_debt_month(p_item_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_debt public.debt_details%rowtype;
  v_due  date;
  v_id   uuid;
begin
  select d.* into v_debt from public.debt_details d where d.item_id = p_item_id;
  select due_date into v_due from public.items where id = p_item_id;
  if v_debt.monthly_amount is null or v_due is null then
    raise exception 'no monthly payment is due';
  end if;
  insert into public.debt_payments (item_id, amount, for_month)
  values (p_item_id, v_debt.monthly_amount, date_trunc('month', v_due)::date)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.pay_debt_month(uuid) to authenticated;
revoke all on function public.sync_debt_due(uuid) from public, anon, authenticated;

-- ---------- The summaries count a debt on the day of its payment -----
create or replace function public.agenda_rows(p_day date)
returns table (household_id uuid, domain_id uuid, title text, hour time,
               late boolean, urgent boolean, on_day boolean)
language sql stable security definer set search_path = '' as $$
  with rows as (
    select i.id, i.household_id, i.kind, i.domain_id, i.title,
           case when i.kind = 'appointment' and i.starts_at is not null
                then (i.starts_at at time zone 'Asia/Jerusalem')::time
                when i.kind in ('goal', 'issue') then null
                else i.due_time end as hour,
           case when i.kind = 'issue' then null else i.due_date end as own_due,
           (i.kind <> 'issue' and i.time_mode = 'urgent') as own_urgent
    from public.items i
    where i.status = 'open'
      and i.hidden = false
      and i.is_complete
      -- An appointment whose day passed is asked about, not counted as late.
      and not (i.kind = 'appointment'
               and i.due_date < (now() at time zone 'Asia/Jerusalem')::date)
      and (i.kind in ('issue', 'appointment')
           or (i.kind = 'debt' and i.due_date is not null)
           or (i.kind in ('task', 'goal')
               and i.time_mode not in ('waiting', 'someday')))
      and not exists (
        select 1 from public.items p
        where p.id = i.parent_id
          and p.kind in ('goal', 'issue')
          and p.status = 'open'
          and p.hidden = false
          and p.is_complete
          -- A goal that waits or is on the shelf is not counted, so its steps count alone.
          and (p.kind = 'issue' or p.time_mode not in ('waiting', 'someday'))
      )
  ),
  dated as (
    select r.*,
           case when r.kind = 'goal' then coalesce(st.first_due, r.own_due)
                else least(r.own_due, st.first_due) end as due,
           (r.kind = 'goal' and r.own_due is not null) as has_target,
           (r.own_urgent or exists (
              select 1 from public.items s
              where r.kind in ('goal', 'issue')
                and s.parent_id = r.id
                and s.kind = 'task'
                and s.status = 'open'
                and s.time_mode = 'urgent')) as is_urgent
    from rows r
    cross join lateral (
      select min(s.due_date) as first_due from public.items s
      where r.kind in ('goal', 'issue')
        and s.parent_id = r.id
        and s.kind = 'task'
        and s.status = 'open'
    ) st
  ),
  judged as (
    select d.*,
           (coalesce(d.due < p_day, false)
            or coalesce(d.has_target and d.own_due < p_day, false)) as is_late,
           coalesce(d.has_target and d.own_due = p_day, false) as target_day
    from dated d
  )
  select j.household_id, j.domain_id, j.title, j.hour,
         j.is_late, j.is_urgent and not j.is_late,
         not j.is_late and (j.due = p_day or j.target_day)
  from judged j
  where j.is_late or j.is_urgent or j.due = p_day or j.target_day
$$;
