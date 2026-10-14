-- =====================================================================
-- 0036 - Repeating, part three: Hebrew birthdays and anniversaries
-- Each Hebrew birthday and wedding anniversary becomes one item that repeats
-- every Hebrew year (its day kept by the profile, "after sunset" included),
-- instead of a new task every year. Each year is an occurrence: its history
-- shows which years were seen to, and every reminder of the item rings every
-- year. As before, an occurrence falls a week before the Hebrew date.
-- The database has no Hebrew calendar, so the app sends the days of the years
-- ahead with every sync, and the series follows them.
-- What exists moves over when the app next syncs: the open task of the year
-- becomes the series (with its reminder, now "on the day at 09:00"), and the
-- years already done become done occurrences of it. Nothing is deleted.
-- The send-reminders edge function needs no change.
-- Run once in the Supabase SQL editor, after 0035.
-- =====================================================================

alter table public.item_repeats
  -- Days given in full (the years ahead of a Hebrew date); when set, they are the series' days.
  add column dates  date[] not null default '{}',
  -- The days are those of a Hebrew date, every year.
  add column hebrew boolean not null default false;

create or replace function public.repeat_is_day(p_rep public.item_repeats, p_day date)
returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  v_week_start date;
begin
  if p_day < p_rep.starts_on then
    return false;
  end if;
  if cardinality(p_rep.dates) > 0 then
    return p_day = any (p_rep.dates);
  end if;
  if p_rep.unit = 'week' and cardinality(p_rep.weekdays) > 0 then
    v_week_start := p_rep.starts_on - extract(dow from p_rep.starts_on)::integer;
    return extract(dow from p_day)::smallint = any (p_rep.weekdays)
           and ((p_day - v_week_start) / 7) % p_rep.every = 0;
  end if;
  return public.repeat_day_after(p_rep.starts_on, p_rep.every, p_rep.unit, p_day, true) = p_day;
end $$;

create or replace function public.repeat_day_next(p_rep public.item_repeats, p_day date)
returns date
language plpgsql immutable set search_path = '' as $$
declare
  v_day date := p_day;
begin
  if cardinality(p_rep.dates) > 0 then
    return (select min(d) from unnest(p_rep.dates) as d
            where d > p_day and d >= p_rep.starts_on);
  end if;
  if p_rep.unit = 'week' and cardinality(p_rep.weekdays) > 0 then
    for i in 1 .. 7 * p_rep.every * 2 + 7 loop
      v_day := greatest(p_day + i, p_rep.starts_on);
      if public.repeat_is_day(p_rep, v_day) and v_day > p_day then
        return v_day;
      end if;
    end loop;
    return null;
  end if;
  return public.repeat_day_after(p_rep.starts_on, p_rep.every, p_rep.unit, p_day, false);
end $$;

-- Keeps the series of one Hebrew birthday or anniversary: its title, domain and days of the
-- years ahead. Made the first time, from the year's open task when there is one; the years
-- already done become its done occurrences.
create function public.sync_occasion(
  p_prefix    text,
  p_title     text,
  p_domain_id uuid,
  p_dates     date[]
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
  v_entity    uuid;
  v_item      public.items%rowtype;
  v_rep       public.item_repeats%rowtype;
  v_dates     date[] := coalesce(array(select distinct d from unnest(p_dates) as d
                                       where d is not null order by d), '{}');
  v_old       record;
  v_new       boolean := false;
begin
  if v_household is null then
    raise exception 'not signed in to a household';
  end if;
  if p_prefix !~ '^(birthday|anniversary):[0-9a-f-]{36}:$' then
    raise exception 'not an occasion';
  end if;
  v_entity := split_part(p_prefix, ':', 2)::uuid;
  if not public.can_see_entity(v_entity) then
    raise exception 'entity not found';
  end if;
  if p_domain_id is not null and not public.can_see_domain(p_domain_id) then
    raise exception 'domain not found';
  end if;
  if cardinality(v_dates) = 0 then
    raise exception 'an occasion needs its days';
  end if;

  select * into v_item from public.items
  where household_id = v_household and auto_key = p_prefix;

  if v_item.id is null then
    -- The year's open task becomes the series, keeping its reminders and recipients.
    select * into v_item from public.items
    where household_id = v_household and auto_key like p_prefix || '%' and status = 'open'
    order by due_date nulls last
    limit 1;
    if v_item.id is not null then
      update public.item_reminders r
      set rule = 'day',
          days_before = greatest(0, v_item.due_date - (r.at at time zone 'Asia/Jerusalem')::date),
          at_time = (r.at at time zone 'Asia/Jerusalem')::time,
          at = null,
          legacy = false
      where r.item_id = v_item.id and r.legacy and r.rule = 'at' and v_item.due_date is not null
        and (r.at at time zone 'Asia/Jerusalem')::date <= v_item.due_date;
      update public.items
      set auto_key = p_prefix, remind_at = null, remind_member_ids = null
      where id = v_item.id;
    else
      insert into public.items (title, kind, domain_id, time_mode, auto_key)
      values (p_title, 'task', p_domain_id, 'anytime', p_prefix)
      returning * into v_item;
      v_new := true;
    end if;
  end if;

  -- The years already done are done occurrences of the series, and leave "done" as items.
  for v_old in
    select i.id, i.due_date, i.completed_by, i.completed_at from public.items i
    where i.household_id = v_household and i.auto_key like p_prefix || '%'
      and i.auto_key <> p_prefix and i.status = 'done' and i.hidden = false
  loop
    if v_old.due_date is not null and not exists (
         select 1 from public.occurrences o where o.item_id = v_item.id and o.on_date = v_old.due_date) then
      insert into public.occurrences (item_id, on_date, status, done_by, done_at)
      values (v_item.id, v_old.due_date, 'done', v_old.completed_by,
              coalesce(v_old.completed_at, now()));
    end if;
    update public.items set hidden = true where id = v_old.id;
  end loop;

  insert into public.item_repeats as r
    (item_id, every, unit, starts_on, dates, hebrew, missed_from, updated_at)
  values (v_item.id, 1, 'year', least(v_dates[1], public.today_in_israel()), v_dates, true,
          public.today_in_israel(), now())
  on conflict (item_id) do update
    set dates = excluded.dates, hebrew = true, unit = 'year', every = 1,
        starts_on = least(r.starts_on, excluded.starts_on), updated_at = now()
  returning * into v_rep;

  update public.items
  set title = p_title,
      domain_id = coalesce(domain_id, p_domain_id),
      time_mode = 'recurring',
      recurrence_rule = 'FREQ=YEARLY'
  where id = v_item.id;

  -- Where it stands: an occurrence already due stays to be marked; otherwise the next year.
  select * into v_item from public.items where id = v_item.id;
  if v_item.due_date is null or v_item.due_date > public.today_in_israel() then
    perform public.apply_slot(v_item.id,
      public.repeat_first_slot(v_rep, public.occurrence_count(v_item.id)));
  end if;

  -- A new series rings on its day at nine, for the parents chosen in the settings.
  if v_new then
    insert into public.item_reminders (item_id, rule, days_before, at_time, member_ids)
    select v_item.id, 'day', 0, time '09:00', h.auto_remind_member_ids
    from public.households h where h.id = v_household;
  end if;
end $$;

revoke execute on function public.sync_occasion(text, text, uuid, date[]) from public, anon;
grant execute on function public.sync_occasion(text, text, uuid, date[]) to authenticated;

-- A device on the previous version still syncs one task a year: once the series exists, it
-- leaves it alone (it would otherwise remove it as last year's task).
create or replace function public.sync_auto_reminder(
  p_prefix    text,
  p_key       text,
  p_title     text,
  p_domain_id uuid,
  p_due       date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
  v_entity    uuid;
begin
  if v_household is null then
    raise exception 'not signed in to a household';
  end if;
  if p_prefix !~ '^(birthday|anniversary):[0-9a-f-]{36}:$' then
    raise exception 'not an occasion reminder';
  end if;
  if left(p_key, length(p_prefix)) <> p_prefix then
    raise exception 'the key must start with the prefix';
  end if;
  v_entity := split_part(p_prefix, ':', 2)::uuid;
  if not public.can_see_entity(v_entity) then
    raise exception 'entity not found';
  end if;
  if p_domain_id is not null and not public.can_see_domain(p_domain_id) then
    raise exception 'domain not found';
  end if;
  if exists (select 1 from public.items where household_id = v_household and auto_key = p_prefix) then
    return;
  end if;

  delete from public.items
  where household_id = v_household
    and auto_key like p_prefix || '%'
    and auto_key <> p_key
    and status = 'open';

  insert into public.items
    (title, kind, domain_id, time_mode, due_date, remind_at, remind_member_ids, auto_key)
  values (p_title, 'task', p_domain_id, 'scheduled', p_due,
          (p_due + time '09:00') at time zone 'Asia/Jerusalem',
          (select h.auto_remind_member_ids from public.households h where h.id = v_household),
          p_key)
  on conflict (household_id, auto_key) do update
    set title     = excluded.title,
        domain_id = coalesce(public.items.domain_id, excluded.domain_id)
    where public.items.status = 'open'
      and (public.items.title <> excluded.title or public.items.domain_id is null);
end $$;

-- The household's choice of who gets the occasion reminders applies to the series too.
create or replace function public.set_auto_reminder_recipients(p_member_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
begin
  if v_household is null then
    raise exception 'not a member';
  end if;
  if p_member_ids is not null and exists (
    select 1 from unnest(p_member_ids) as chosen(id)
    where not exists (
      select 1 from public.members m where m.id = chosen.id and m.household_id = v_household
    )
  ) then
    raise exception 'member not in household';
  end if;

  update public.households
  set auto_remind_member_ids = nullif(p_member_ids, '{}')
  where id = v_household;

  update public.items
  set remind_member_ids = nullif(p_member_ids, '{}')
  where household_id = v_household
    and auto_key is not null
    and status = 'open'
    and reminder_sent_at is null;

  update public.item_reminders r
  set member_ids = nullif(p_member_ids, '{}')
  from public.items i
  where r.item_id = i.id and i.household_id = v_household
    and i.status = 'open' and i.auto_key ~ '^(birthday|anniversary):[0-9a-f-]{36}:$';
end $$;
