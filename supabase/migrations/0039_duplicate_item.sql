-- =====================================================================
-- 0039 - Duplicating an item
-- "שכפול" in an item's page makes a new, open item like it, which is then
-- changed like any other. It takes the title, kind, entity and domain, notes,
-- time and repeat, reminders and their people, the place of an appointment,
-- a debt's details, named values, conditions, and the steps, questions and
-- trackers under a goal or an issue (all open). It does not take being done,
-- past occurrences, tracker entries, attachments, or a place in a shopping run.
-- Nothing that exists is changed.
-- Run once in the Supabase SQL editor, after 0038.
-- =====================================================================

-- Copies one item, and the items under it, under `p_parent` (null for the copied item itself).
create function public.duplicate_item_row(p_source uuid, p_parent uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_row   public.items%rowtype;
  v_new   uuid := gen_random_uuid();
  v_child uuid;
  v_cols  text;
begin
  select * into v_row from public.items where id = p_source;

  v_row.id                 := v_new;
  v_row.parent_id          := coalesce(p_parent, v_row.parent_id);
  v_row.status             := 'open';
  v_row.completed_by       := null;
  v_row.completed_at       := null;
  v_row.created_by         := null;
  v_row.review_by          := null;
  v_row.created_at         := now();
  v_row.run_id             := null;
  v_row.reminder_sent_at   := null;
  -- The reminders are copied as they are below, not made again from the old field.
  v_row.remind_at          := null;
  v_row.auto_key           := null;
  v_row.series_id          := null;
  v_row.closed_with_parent := false;
  -- Every column but the computed ones, so a column added later is copied too.
  select string_agg(quote_ident(attname), ', ' order by attnum) into v_cols
  from pg_catalog.pg_attribute
  where attrelid = 'public.items'::regclass and attnum > 0 and not attisdropped
    and attgenerated = '';
  execute format(
    'insert into public.items (%s) select %s from jsonb_populate_record(null::public.items, $1)',
    v_cols, v_cols)
  using to_jsonb(v_row);

  -- An appointment is given reminders of its own as it is added; the copied ones replace them.
  delete from public.item_reminders where item_id = v_new;

  insert into public.item_repeats (
    item_id, every, unit, starts_on, at_time, end_kind, end_count, end_until, stopped_on,
    missed_from, times, weekdays, from_kind, tracker_closes, dates, hebrew)
  select v_new, every, unit, starts_on, at_time, end_kind, end_count, end_until, stopped_on,
    (now() at time zone 'Asia/Jerusalem')::date, times, weekdays, from_kind, tracker_closes,
    dates, hebrew
  from public.item_repeats where item_id = p_source
  on conflict (item_id) do update set
    every = excluded.every, unit = excluded.unit, starts_on = excluded.starts_on,
    at_time = excluded.at_time, end_kind = excluded.end_kind, end_count = excluded.end_count,
    end_until = excluded.end_until, stopped_on = excluded.stopped_on,
    missed_from = excluded.missed_from, times = excluded.times, weekdays = excluded.weekdays,
    from_kind = excluded.from_kind, tracker_closes = excluded.tracker_closes,
    dates = excluded.dates, hebrew = excluded.hebrew;

  insert into public.item_reminders (
    item_id, rule, at, minutes_before, days_before, at_time, every, unit, until, member_ids)
  select v_new, rule, at, minutes_before, days_before, at_time, every, unit, until, member_ids
  from public.item_reminders where item_id = p_source;

  insert into public.item_data (item_id, label, value, position)
  select v_new, label, value, position from public.item_data where item_id = p_source;

  insert into public.prerequisites (item_id, depends_on_item_id, description, is_met)
  select v_new, depends_on_item_id, description, is_met
  from public.prerequisites where item_id = p_source;

  insert into public.debt_details (item_id, amount, counterparty, direction)
  select v_new, amount, counterparty, direction
  from public.debt_details where item_id = p_source;

  for v_child in
    select id from public.items where parent_id = p_source order by created_at, id
  loop
    perform public.duplicate_item_row(v_child, v_new);
  end loop;

  return v_new;
end $$;

revoke execute on function public.duplicate_item_row(uuid, uuid) from public, anon, authenticated;

-- What the app calls: only an item the parent can see, and not a shopping run or a question.
create function public.duplicate_item(p_item_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.item_kind;
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  select kind into v_kind from public.items where id = p_item_id;
  if v_kind::text in ('shopping_run', 'question') then
    raise exception 'this kind is not duplicated';
  end if;
  return public.duplicate_item_row(p_item_id, null);
end $$;

grant execute on function public.duplicate_item(uuid) to authenticated;
