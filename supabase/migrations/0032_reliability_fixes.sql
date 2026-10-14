-- =====================================================================
-- 0032 - Reliability fixes from the audit
-- 1. A reminder whose sending failed for a passing reason (the push service
--    was down) is tried again on the next run, instead of being lost.
-- 2. Conversions: a repeating task that becomes a goal keeps its date as the
--    goal's target date (a goal does not repeat); nothing converts to or from
--    an appointment, which needs its own date and hour; a missing item goes
--    to the shopping of the entity chosen even before a domain.
-- 3. Moving a row of a note (a recipe's lines) happens in one step on the
--    server, by the order saved there, so quick taps cannot leave two rows
--    in the same place; rows that already share a place are put in order.
-- 4. A parent can change only their own member row, not the other parent's.
-- Nothing that exists is deleted.
-- Run once in the Supabase SQL editor, after 0031. Then redeploy the
-- send-reminders edge function.
-- =====================================================================

-- ---------- 1. Try a failed reminder again --------------------------
-- For the edge function only: makes an item's reminder due again, if it was claimed in the
-- last quarter of an hour (so an old reminder is never sent anew by mistake).
create function public.release_reminder(p_item_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.items
  set reminder_sent_at = null
  where id = p_item_id
    and remind_at is not null
    and reminder_sent_at > now() - interval '15 minutes'
$$;

revoke execute on function public.release_reminder(uuid) from public, anon, authenticated;
grant execute on function public.release_reminder(uuid) to service_role;

-- ---------- 2. Conversions ------------------------------------------
create or replace function public.convert_item(
  p_item_id      uuid,
  p_kind         public.item_kind,
  p_detach_steps boolean default false,
  p_category     public.shopping_category default null,
  p_amount       numeric default null,
  p_counterparty text default null,
  p_direction    public.debt_direction default null
) returns void
language plpgsql set search_path = '' as $$
declare
  v_item    public.items%rowtype;
  v_debt    public.debt_details%rowtype;
  v_title   text;
  v_domain  uuid;
  v_entity  uuid;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'item not found';
  end if;
  if v_item.kind in ('shopping_run', 'question', 'appointment') or v_item.parent_id is not null then
    raise exception 'this item cannot be converted';
  end if;
  if p_kind in ('shopping_run', 'question', 'appointment') then
    raise exception 'an item cannot be converted to this kind';
  end if;
  if p_kind = v_item.kind then
    return;
  end if;

  v_title  := v_item.title;
  v_domain := v_item.domain_id;

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

-- Goals already left repeating by a conversion take the same rule.
update public.items
set time_mode = case when due_date is null then 'anytime' else 'scheduled' end::public.item_time_mode,
    recurrence_rule = null
where kind = 'goal' and time_mode = 'recurring';

-- ---------- 3. Moving a row of a note -------------------------------
-- Runs with the caller's rights, so only rows of items they can see are touched.
create function public.move_item_data(p_row_id uuid, p_step integer) returns void
language plpgsql set search_path = '' as $$
declare
  v_item  uuid;
  v_rows  uuid[];
  v_index integer;
  v_other integer;
  v_held  uuid;
begin
  select item_id into v_item from public.item_data where id = p_row_id;
  if not found then
    raise exception 'row not found';
  end if;
  -- The item's rows in their saved order, held until done so two moves cannot interleave.
  select array_agg(r.id order by r.position, r.created_at, r.id) into v_rows
  from (
    select id, position, created_at from public.item_data where item_id = v_item for update
  ) r;
  v_index := array_position(v_rows, p_row_id);
  v_other := v_index + sign(p_step)::integer;
  if v_other < 1 or v_other > cardinality(v_rows) then
    return;
  end if;
  v_held := v_rows[v_index];
  v_rows[v_index] := v_rows[v_other];
  v_rows[v_other] := v_held;
  -- Every row gets its own place again, 1, 2, 3..., which also mends rows that shared one.
  update public.item_data d
  set position = n.place
  from unnest(v_rows) with ordinality as n(id, place)
  where d.id = n.id;
end $$;

grant execute on function public.move_item_data(uuid, integer) to authenticated;

-- ---------- 4. A parent changes only their own member row -----------
drop policy members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (id = public.current_member_id())
  with check (id = public.current_member_id() and household_id = public.current_household_id());
