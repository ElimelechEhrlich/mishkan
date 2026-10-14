-- =====================================================================
-- 0037 - Steps, goals and conversions
-- 1. A step of a goal that has a date stays within it: its date, and the last
--    occurrence of a repeating step, are not after the goal's date. Steps that
--    are already later stay as they are (the app shows them for attention).
-- 2. A goal that gets a date: its steps that repeat with no end now end on it.
--    Moving a goal's date earlier than its steps is refused, naming them.
-- 3. Closing a goal, or resolving an issue, closes its open steps "with the
--    goal" (not done); opening it again opens them again, and a repeating step
--    goes on from its next occurrence from today, with nothing missed between.
-- 4. A goal's progress counts occurrences: how many each item has, by status.
-- 5. A task converts to an appointment and back. An appointment needs a day and
--    an hour; time, repetition and reminders carry over. A kind that does not
--    repeat keeps the repetition hidden, and it does not run meanwhile.
-- The send-reminders edge function needs no change.
-- Run once in the Supabase SQL editor, after 0036.
-- =====================================================================

alter table public.items
  -- Closed because its goal or issue was closed, not done; opened again with it.
  add column closed_with_parent boolean not null default false;

-- ---------- 1. Steps within the goal's date -------------------------
-- A goal's date, when it has one.
create function public.goal_target(p_goal_id uuid) returns date
language sql stable set search_path = '' as $$
  select i.due_date from public.items i
  where i.id = p_goal_id and i.kind = 'goal' and i.time_mode = 'scheduled'
$$;

-- The last day an item is due: its date, or the last occurrence of its series ('infinity'
-- when it repeats with no end). Null when it has no date.
create function public.item_last_day(p_item public.items) returns date
language plpgsql stable set search_path = '' as $$
declare
  v_rep    public.item_repeats%rowtype;
  v_slot   timestamp;
  v_base   timestamp;
  v_next   timestamp;
  v_last   timestamp;
  v_marked integer;
begin
  if p_item.time_mode is distinct from 'recurring' then
    return case when p_item.time_mode = 'scheduled' then p_item.due_date end;
  end if;
  select * into v_rep from public.item_repeats where item_id = p_item.id;
  v_slot := public.item_slot(p_item);
  if v_rep.item_id is null or v_slot is null or v_rep.stopped_on is not null then
    return v_slot::date;
  end if;
  if v_rep.end_kind = 'never' then
    return 'infinity'::date;
  end if;
  if v_rep.end_kind = 'until' then
    return greatest(v_slot::date, v_rep.end_until);
  end if;
  -- A number of times: walk the ones left.
  v_marked := public.occurrence_count(p_item.id);
  v_base := coalesce(v_rep.planned_date + coalesce(v_rep.planned_time, time '00:00'), v_slot);
  v_last := v_slot;
  for i in 1 .. greatest(v_rep.end_count, 0) loop
    v_marked := v_marked + 1;
    v_next := public.repeat_next_slot(v_rep, v_base, false, v_marked);
    exit when v_next is null;
    v_last := greatest(v_last, v_next);
    v_base := v_next;
  end loop;
  return v_last::date;
end $$;

-- A step's own date can not be set after its goal's date. A repeating step is checked by its
-- series below; one already late keeps its date until it is changed.
create function public.items_step_in_goal() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_target date;
begin
  if new.parent_id is null or new.status <> 'open' or new.due_date is null
     or new.time_mode is distinct from 'scheduled' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.due_date is not distinct from old.due_date
     and new.parent_id is not distinct from old.parent_id
     and new.time_mode is not distinct from old.time_mode then
    return new;
  end if;
  v_target := public.goal_target(new.parent_id);
  if v_target is not null and new.due_date > v_target then
    raise exception 'step after the goal date';
  end if;
  return new;
end $$;

create trigger items_step_in_goal
  before insert or update of due_date, parent_id, time_mode on public.items
  for each row execute function public.items_step_in_goal();

-- A repeating step's series ends by its goal's date. Checked when the transaction ends, after
-- the series and the item's occurrence are both set.
create function public.item_repeats_in_goal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item   public.items%rowtype;
  v_target date;
begin
  select * into v_item from public.items where id = new.item_id;
  if v_item.id is null or v_item.parent_id is null or v_item.status <> 'open'
     or v_item.time_mode <> 'recurring' then
    return null;
  end if;
  v_target := public.goal_target(v_item.parent_id);
  if v_target is not null and public.item_last_day(v_item) > v_target then
    raise exception 'step repeats past the goal date';
  end if;
  return null;
end $$;

create constraint trigger item_repeats_in_goal
  after insert or update of every, unit, starts_on, times, weekdays, from_kind, end_kind,
    end_count, end_until, stopped_on, dates
  on public.item_repeats
  deferrable initially deferred
  for each row execute function public.item_repeats_in_goal();

-- Moving one occurrence of a step stays within the goal's date too.
create or replace function public.move_occurrence(p_item_id uuid, p_date date, p_time time)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep    public.item_repeats%rowtype;
  v_item   public.items%rowtype;
  v_slot   timestamp;
  v_target date;
begin
  v_rep := public.repeat_of(p_item_id);
  select * into v_item from public.items where id = p_item_id for update;
  v_slot := public.item_slot(v_item);
  if v_rep.item_id is null or v_item.time_mode <> 'recurring' or v_slot is null then
    raise exception 'there is no occurrence to move';
  end if;
  if v_item.kind = 'appointment' and p_time is null then
    raise exception 'an appointment needs an hour';
  end if;
  v_target := public.goal_target(v_item.parent_id);
  if v_target is not null and p_date > v_target then
    raise exception 'step after the goal date';
  end if;
  update public.item_repeats
  set planned_date = coalesce(planned_date, v_slot::date),
      planned_time = case when planned_date is null then
                       case when cardinality(public.repeat_times(v_rep)) > 0 then v_slot::time end
                     else planned_time end
  where item_id = p_item_id;
  if v_item.kind = 'appointment' then
    update public.items
    set starts_at = (p_date + p_time) at time zone 'Asia/Jerusalem', due_date = p_date
    where id = p_item_id;
  else
    update public.items set due_date = p_date, due_time = p_time where id = p_item_id;
  end if;
end $$;

-- ---------- 2. A goal's date and its steps --------------------------
-- A goal that gets a date (or an earlier one): steps repeating with no end end on it; any
-- step still later refuses the change, naming the steps.
create function public.items_goal_target() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new  date := case when new.time_mode = 'scheduled' then new.due_date end;
  v_old  date := case when old.time_mode = 'scheduled' then old.due_date end;
  v_late text;
begin
  if new.kind <> 'goal' or v_new is null or (v_old is not null and v_new >= v_old) then
    return new;
  end if;
  update public.item_repeats r
  set end_kind = 'until', end_until = v_new, end_count = null, updated_at = now()
  from public.items s
  where s.id = r.item_id and s.parent_id = new.id and s.status = 'open'
    and s.time_mode = 'recurring' and r.end_kind = 'never' and r.stopped_on is null;
  select string_agg(s.title, ', ' order by s.title) into v_late
  from public.items s
  where s.parent_id = new.id and s.status = 'open' and not s.hidden
    and public.item_last_day(s) > v_new;
  if v_late is not null then
    raise exception 'steps after the goal date: %', v_late;
  end if;
  return new;
end $$;

create trigger items_goal_target
  before update of due_date, time_mode on public.items
  for each row execute function public.items_goal_target();

-- ---------- 3. Closing a goal or an issue closes its steps ----------
create function public.items_close_with_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.items%rowtype;
  v_rep  public.item_repeats%rowtype;
  v_slot timestamp;
begin
  if new.kind not in ('goal', 'issue') or new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'done' then
    -- Its open steps close with it; a repeating one stops without marking its occurrence.
    perform set_config('mishkan.close_series', 'on', true);
    update public.items
    set status = 'done', closed_with_parent = true
    where parent_id = new.id and status = 'open' and kind <> 'question';
    perform set_config('mishkan.close_series', 'off', true);
  else
    for v_step in
      select * from public.items where parent_id = new.id and closed_with_parent
    loop
      update public.items
      set status = 'open', closed_with_parent = false
      where id = v_step.id;
      if v_step.time_mode = 'recurring' then
        -- Goes on from its next occurrence from today; the time between is not missed.
        update public.item_repeats
        set missed_from = public.today_in_israel(), planned_date = null, planned_time = null,
            updated_at = now()
        where item_id = v_step.id
        returning * into v_rep;
        v_slot := public.item_slot(v_step);
        if v_rep.item_id is not null
           and (v_slot is null or v_slot::date < public.today_in_israel()) then
          perform public.apply_slot(v_step.id,
            public.repeat_first_slot(v_rep, public.occurrence_count(v_step.id)));
        end if;
      end if;
    end loop;
  end if;
  return null;
end $$;

create trigger items_close_with_parent
  after update of status on public.items
  for each row execute function public.items_close_with_parent();

-- A step marked on its own clears the mark, so only those closed with the goal reopen with it.
create function public.items_clear_closed_with_parent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.closed_with_parent and old.closed_with_parent and new.status = 'open'
     and old.status = 'done' then
    new.closed_with_parent := false;
  end if;
  return new;
end $$;

create trigger items_clear_closed_with_parent
  before update of status on public.items
  for each row execute function public.items_clear_closed_with_parent();

-- ---------- 4. Occurrences counted for progress ---------------------
create view public.occurrence_counts
with (security_invoker = true) as
select o.item_id,
       count(*) filter (where o.status = 'done')::integer as done,
       count(*) filter (where o.status in ('done', 'skipped', 'missed'))::integer as gone
from public.occurrences o
group by o.item_id;

grant select on public.occurrence_counts to authenticated;

-- ---------- 5. Conversions ------------------------------------------
-- Only a kind that repeats rolls its occurrences; one converted away keeps its series hidden.
create or replace function public.roll_occurrences() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  for v_id in
    select i.id from public.items i
    join public.item_repeats r on r.item_id = i.id
    where i.status = 'open' and i.time_mode = 'recurring' and r.from_kind = 'schedule'
      and i.kind in ('task', 'appointment', 'tracker', 'missing_item')
      and i.due_date <= public.today_in_israel()
  loop
    perform public.roll_item(v_id);
  end loop;
end $$;

-- A repeating appointment has one hour: the one it starts at.
create function public.repeat_one_hour(p_item_id uuid, p_time time) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  update public.item_repeats
  set times = array[p_time], at_time = p_time, from_kind = 'schedule', updated_at = now()
  where item_id = p_item_id;
end $$;

revoke execute on function public.repeat_one_hour(uuid, time) from public, anon;
grant execute on function public.repeat_one_hour(uuid, time) to authenticated;

drop function public.convert_item(uuid, public.item_kind, boolean, public.shopping_category,
  numeric, text, public.debt_direction);

create function public.convert_item(
  p_item_id      uuid,
  p_kind         public.item_kind,
  p_detach_steps boolean default false,
  p_category     public.shopping_category default null,
  p_amount       numeric default null,
  p_counterparty text default null,
  p_direction    public.debt_direction default null,
  -- For a new appointment whose item has no hour: when it starts.
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
  if v_item.kind in ('shopping_run', 'question') or v_item.parent_id is not null then
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

grant execute on function public.convert_item(uuid, public.item_kind, boolean,
  public.shopping_category, numeric, text, public.debt_direction, timestamptz) to authenticated;
