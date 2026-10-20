-- =====================================================================
-- 0047 - A shopping domain holds things to buy, and going out to buy them
-- A shopping domain now holds only missing items, shopping runs, and the
-- task of going out shopping ("לצאת לקניות") for one list: supermarket,
-- clothing, urgent or planned. Nothing else can be saved in it or moved to
-- it, from the app or from the chat. That task is a task like any other
-- (a time, reminders, repeating), and opens its list from its page. When a
-- run of its list finishes, it is marked, and "להשלמה" asks whether to
-- close it; it is not closed by itself. A missing item converted to another
-- kind leaves the shopping domain and waits in "להשלמה" for a domain.
-- Run once in the Supabase SQL editor, after 0046.
-- =====================================================================

alter table public.items
  -- The list a task of going out shopping is for; null for any other item.
  add column shopping_trip    public.shopping_category,
  -- When a run of its list finished while it was open, so "להשלמה" asks to close it.
  add column trip_run_done_at timestamptz;

-- ---------- What a shopping domain holds -----------------------------
create or replace function public.items_check_shopping() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_shopping boolean := new.domain_id is not null and exists (
    select 1 from public.domains d where d.id = new.domain_id and d.role = 'shopping'
  );
begin
  if new.kind = 'missing_item' and new.domain_id is not null and not v_shopping then
    raise exception 'a missing item must be in a shopping domain';
  end if;
  if new.shopping_trip is not null and (new.kind <> 'task' or new.parent_id is not null) then
    raise exception 'only a task of its own goes out shopping';
  end if;
  if new.shopping_trip is not null and not v_shopping then
    raise exception 'going out shopping stays in a shopping domain';
  end if;
  if v_shopping and new.kind not in ('missing_item', 'shopping_run') and new.shopping_trip is null then
    raise exception 'a shopping domain holds things to buy and going out shopping only';
  end if;

  if new.kind <> 'missing_item' then
    new.run_id := null;
  end if;
  if new.shopping_trip is null then
    new.trip_run_done_at := null;
  end if;

  if new.run_id is not null and not exists (
    select 1 from public.items r
    where r.id = new.run_id and r.kind = 'shopping_run' and r.household_id = new.household_id
  ) then
    raise exception 'run not found';
  end if;

  return new;
end $$;

-- ---------- A run knows its list -------------------------------------
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

  insert into public.items (title, kind, domain_id, shopping_category)
  values (
    'סבב קניות · ' || case p_category
      when 'food'     then 'סופר'
      when 'clothing' then 'ביגוד'
      when 'urgent'   then 'דחוף'
      when 'planned'  then 'מתוכננת'
    end,
    'shopping_run',
    v_domain,
    p_category
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

-- ---------- A finished run marks the going out of its list ------------
create or replace function public.items_shopping_after_status() returns trigger
language plpgsql as $$
declare
  v_category public.shopping_category;
  v_entity   uuid;
  v_private  boolean;
begin
  if new.kind = 'missing_item' and new.run_id is not null and new.status = 'done'
     and not exists (
       select 1 from public.items i
       where i.run_id = new.run_id and i.status = 'open'
     ) then
    update public.items set status = 'done' where id = new.run_id and status = 'open';
  end if;

  if new.kind = 'shopping_run' and new.status = 'done' then
    update public.items set run_id = null where run_id = new.id and status = 'open';

    -- The open going out of the same list, in the same part of the home (shared, or the
    -- parent's own), is marked, for "להשלמה" to ask whether to close it.
    v_category := coalesce(new.shopping_category, (
      select i.shopping_category from public.items i
      where i.run_id = new.id and i.shopping_category is not null limit 1));
    select e.id, e.kind = 'personal' into v_entity, v_private
    from public.domains d join public.entities e on e.id = d.entity_id
    where d.id = new.domain_id;
    if v_category is not null then
      update public.items t
      set trip_run_done_at = now()
      from public.domains d
      join public.entities e on e.id = d.entity_id
      where d.id = t.domain_id
        and t.household_id = new.household_id
        and t.shopping_trip = v_category
        and t.status = 'open'
        and (
          (v_private and e.id = v_entity)
          or (not coalesce(v_private, false) and e.kind <> 'personal')
        );
    end if;
  end if;

  -- Put back as not bought after its run finished: back on the list, free for a new run.
  if new.kind = 'missing_item' and new.status = 'open' and new.run_id is not null
     and exists (
       select 1 from public.items r where r.id = new.run_id and r.status <> 'open'
     ) then
    update public.items set run_id = null where id = new.id;
  end if;

  return null;
end $$;

-- ---------- Conversions keep the shopping domain to things to buy ----
create or replace function public.convert_item(
  p_item_id      uuid,
  p_kind         public.item_kind,
  p_detach_steps boolean default false,
  p_category     public.shopping_category default null,
  p_amount       numeric default null,
  p_counterparty text default null,
  p_direction    public.debt_direction default null,
  p_starts_at    timestamptz default null
) returns void
language plpgsql set search_path = '' as $$
declare
  v_item    public.items%rowtype;
  v_debt    public.debt_details%rowtype;
  v_rep     public.item_repeats%rowtype;
  v_title   text;
  v_domain  uuid;
  v_entity  uuid;
  v_start   timestamptz;
  v_local   timestamp;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'item not found';
  end if;
  if v_item.kind in ('shopping_run', 'question') or v_item.parent_id is not null
     or v_item.shopping_trip is not null then
    raise exception 'this item cannot be converted';
  end if;
  if p_kind in ('shopping_run', 'question') then
    raise exception 'an item cannot be converted to this kind';
  end if;
  -- An appointment converts to a task and back only.
  if (p_kind = 'appointment' and v_item.kind <> 'task')
     or (v_item.kind = 'appointment' and p_kind <> 'task') then
    raise exception 'an appointment converts only to a task';
  end if;
  if p_kind = v_item.kind then
    return;
  end if;

  v_title  := v_item.title;
  v_domain := v_item.domain_id;
  v_entity := v_item.entity_id;
  select * into v_rep from public.item_repeats where item_id = v_item.id;

  -- steps of a goal / issue that stops being one
  if p_detach_steps and p_kind not in ('goal', 'issue') then
    update public.items c
    set parent_id = null,
        hidden    = false,
        kind      = case when c.kind = 'question' then 'note'::public.item_kind else c.kind end,
        notes     = case
                      when c.kind = 'question' and c.answer is not null
                        then concat_ws(E'\n\n', c.answer, c.notes)
                      else c.notes
                    end
    where c.parent_id = v_item.id;
  end if;

  -- a debt that becomes something else carries its amount and counterparty in its title
  if v_item.kind = 'debt' then
    select * into v_debt from public.debt_details where item_id = v_item.id;
    if found then
      v_title := concat_ws(' · ',
        v_debt.counterparty,
        case v_debt.direction when 'owed_to_us' then 'חייבים לנו' else 'אנחנו חייבים' end,
        '₪' || trim(to_char(v_debt.amount, 'FM999G999G990D00')));
    end if;
  end if;

  -- a debt needs its details; old ones are reused
  if p_kind = 'debt' and not exists (select 1 from public.debt_details where item_id = v_item.id) then
    if p_amount is null or p_amount <= 0 or nullif(trim(p_counterparty), '') is null or p_direction is null then
      raise exception 'a debt needs an amount, a counterparty and a direction';
    end if;
    insert into public.debt_details (item_id, amount, counterparty, direction)
    values (v_item.id, p_amount, trim(p_counterparty), p_direction);
  end if;

  -- a missing item moves to the shopping domain of its entity (the domain's, or the one
  -- chosen before a domain), or of the home
  if p_kind = 'missing_item' then
    select d.entity_id into v_entity from public.domains d where d.id = v_item.domain_id;
    v_entity := coalesce(v_entity, v_item.entity_id);
    select d.id into v_domain
    from public.domains d
    join public.entities e on e.id = d.entity_id
    where d.role = 'shopping'
      and e.household_id = v_item.household_id
      and e.id = v_entity;
    if v_domain is null then
      select d.id into v_domain
      from public.domains d
      join public.entities e on e.id = d.entity_id
      where d.role = 'shopping'
        and e.household_id = v_item.household_id
        and e.kind = 'home';
    end if;
    if v_domain is null then
      raise exception 'shopping domain not found';
    end if;
  end if;

  -- a missing item that becomes something else leaves the shopping domain: it keeps its
  -- entity and waits in "להשלמה" for a domain
  if v_item.kind = 'missing_item' then
    select d.entity_id into v_entity from public.domains d where d.id = v_item.domain_id;
    v_domain := null;
  end if;

  -- A task that becomes an appointment starts at its date and hour, or at the one given.
  if p_kind = 'appointment' then
    v_start := coalesce(p_starts_at,
      case when v_item.due_date is not null and v_item.due_time is not null
        then (v_item.due_date + v_item.due_time) at time zone 'Asia/Jerusalem' end);
    if v_start is null then
      raise exception 'an appointment needs a day and an hour';
    end if;
    v_local := v_start at time zone 'Asia/Jerusalem';
    if v_item.time_mode = 'recurring' and v_rep.item_id is not null then
      perform public.repeat_one_hour(v_item.id, v_local::time);
    end if;
    update public.items
    set starts_at = v_start,
        due_date  = v_local::date,
        due_time  = null,
        time_mode = case when time_mode = 'recurring' then 'recurring'
                         else 'scheduled' end::public.item_time_mode
    where id = v_item.id;
  end if;

  -- An appointment that becomes a task keeps its day and hour as the task's.
  if v_item.kind = 'appointment' and v_item.starts_at is not null then
    v_local := v_item.starts_at at time zone 'Asia/Jerusalem';
    update public.items
    set due_date = v_local::date, due_time = v_local::time
    where id = v_item.id;
  end if;

  update public.items
  set kind              = p_kind,
      title             = v_title,
      domain_id         = v_domain,
      entity_id         = case when v_domain is null then v_entity else entity_id end,
      shopping_category = case
                            when p_kind = 'missing_item'
                              then coalesce(p_category, shopping_category, 'planned')
                            else shopping_category
                          end,
      -- A goal does not repeat: a repeating task's date becomes the goal's target date.
      time_mode         = case
                            when p_kind = 'goal' and time_mode = 'recurring'
                              then case when due_date is null then 'anytime' else 'scheduled' end::public.item_time_mode
                            else time_mode
                          end,
      recurrence_rule   = case
                            when p_kind = 'goal' then null
                            else recurrence_rule
                          end,
      review_by         = public.current_member_id()
  where id = v_item.id;
end $$;
