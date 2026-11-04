-- =====================================================================
-- 0050 - Google Calendar, connected directly to the household's account
-- One parent connects the household's Google account once. The
-- google-calendar edge function then keeps a calendar of its own there,
-- "משכן": every appointment (unless taken out), and for any other item
-- marked "תזכורות ביומן גוגל", a small event at each of its reminders.
-- Nothing in a personal entity goes there, even when picked.
-- What changes is queued here by triggers, and the function sends the queue
-- to Google. The account's token and the events' ids are kept for the
-- function only: the app reads the connection's state through
-- google_link_status().
-- Run once in the Supabase SQL editor, after 0049.
-- =====================================================================

-- The household's connection: one Google account, one calendar in it.
create table public.google_links (
  household_id      uuid primary key references public.households(id) on delete cascade,
  refresh_token     text not null,
  access_token      text,
  access_expires_at timestamptz,
  -- The "משכן" calendar made in the account; null until made.
  calendar_id       text,
  connected_by      uuid references public.members(id) on delete set null,
  connected_at      timestamptz not null default now(),
  last_sync_at      timestamptz,
  last_error        text,
  -- The day the reminders of repeating items were last laid out ahead.
  laid_out_on       date
);

-- What the parents chose for an item: an appointment taken out (false), or another item's
-- reminders put in (true). No row: an appointment is in, anything else is not.
create table public.google_choices (
  item_id      uuid primary key references public.items(id) on delete cascade,
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  included     boolean not null,
  chosen_by    uuid default public.current_member_id()
               references public.members(id) on delete set null,
  chosen_at    timestamptz not null default now()
);

-- Each event the function made for an item, under a key of its own (such as "main" or a
-- reminder's id), with a print of what was sent, so only what changed is sent again. No
-- reference to the item: its events are removed after the item is.
create table public.google_events (
  item_id      uuid not null,
  key          text not null,
  household_id uuid not null references public.households(id) on delete cascade,
  event_id     text not null,
  fingerprint  text not null,
  updated_at   timestamptz not null default now(),
  primary key (item_id, key)
);

-- Items whose events are to be looked at again.
create table public.google_queue (
  item_id      uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  queued_at    timestamptz not null default now()
);

alter table public.google_links   enable row level security;
alter table public.google_choices enable row level security;
alter table public.google_events  enable row level security;
alter table public.google_queue   enable row level security;

-- Whether an item is in a personal entity (its domain's, or its own when it has no domain).
create function public.item_is_personal(p_item_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select coalesce(de.kind, ie.kind) = 'personal'
    from public.items i
    left join public.domains d on d.id = i.domain_id
    left join public.entities de on de.id = d.entity_id
    left join public.entities ie on ie.id = i.entity_id
    where i.id = p_item_id
  ), false)
$$;

create policy google_choices_all on public.google_choices for all to authenticated
  using (household_id = public.current_household_id() and public.can_see_item(item_id))
  with check (
    household_id = public.current_household_id()
    and public.can_see_item(item_id)
    and not public.item_is_personal(item_id)
  );

grant select, insert, update, delete on public.google_choices to authenticated;
revoke all on public.google_links, public.google_events, public.google_queue
  from anon, authenticated;

-- Queues an item, when its household is connected.
create function public.google_enqueue(p_item_id uuid, p_household_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.google_queue (item_id, household_id)
  select p_item_id, p_household_id
  where exists (select 1 from public.google_links l where l.household_id = p_household_id)
  on conflict (item_id) do update set queued_at = now()
$$;

create function public.google_queue_item() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.google_enqueue(old.id, old.household_id);
    return old;
  end if;
  perform public.google_enqueue(new.id, new.household_id);
  return new;
end $$;

create trigger items_google_queue
  after insert or update or delete on public.items
  for each row execute function public.google_queue_item();

-- A row under an item (its repeat, reminders, occurrences, choice) queues the item.
create function public.google_queue_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item uuid := case when tg_op = 'DELETE' then old.item_id else new.item_id end;
begin
  perform public.google_enqueue(v_item, i.household_id)
  from public.items i where i.id = v_item;
  return null;
end $$;

create trigger item_repeats_google_queue
  after insert or update or delete on public.item_repeats
  for each row execute function public.google_queue_owner();
create trigger item_reminders_google_queue
  after insert or update or delete on public.item_reminders
  for each row execute function public.google_queue_owner();
create trigger occurrences_google_queue
  after insert or update or delete on public.occurrences
  for each row execute function public.google_queue_owner();
create trigger google_choices_google_queue
  after insert or update or delete on public.google_choices
  for each row execute function public.google_queue_owner();

-- What the app may know of the household's connection.
create function public.google_link_status()
returns table (connected_at timestamptz, ready boolean, last_sync_at timestamptz, last_error text)
language sql stable security definer set search_path = '' as $$
  select l.connected_at, l.calendar_id is not null, l.last_sync_at, l.last_error
  from public.google_links l
  where l.household_id = public.current_household_id()
$$;

-- The items that have events in the household's calendar now, for the small calendar mark.
create function public.google_synced_items() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct e.item_id
  from public.google_events e
  where e.household_id = public.current_household_id() and public.can_see_item(e.item_id)
$$;

-- The open times of an item from one day to another: its day and hour when it does not
-- repeat; its days in the window when it does (each hour of a day on its own), without the
-- ones done or skipped, and the current one where it is now. For the reminders of a
-- repeating item, laid out ahead one by one.
create function public.google_item_slots(p_item_id uuid, p_from date, p_to date)
returns table (on_date date, at_time time)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_item public.items%rowtype;
  v_rep  public.item_repeats%rowtype;
begin
  select * into v_item from public.items where id = p_item_id;
  if v_item.id is null or v_item.status <> 'open' then
    return;
  end if;
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  if v_rep.item_id is null or v_rep.from_kind = 'completion' then
    if v_item.due_date is not null and v_item.due_date between p_from and p_to then
      return query select v_item.due_date,
        case when v_item.kind::text = 'appointment' and v_item.starts_at is not null
             then (v_item.starts_at at time zone 'Asia/Jerusalem')::time
             else v_item.due_time end;
    end if;
    return;
  end if;
  return query
  with days as (
    select g::date as day
    from generate_series(greatest(v_rep.starts_on, p_from), p_to, interval '1 day') as g
    where public.repeat_is_day(v_rep, g::date)
      and (v_rep.end_kind <> 'until' or g::date <= v_rep.end_until)
      and (v_rep.stopped_on is null or g::date <= v_rep.stopped_on)
      and (v_rep.planned_date is null or g::date <> v_rep.planned_date
           or cardinality(public.repeat_times(v_rep)) > 1)
  ),
  slots as (
    select d.day, t.hour
    from days d
    cross join lateral unnest(
      case when cardinality(public.repeat_times(v_rep)) = 0 then array[null::time]
           else public.repeat_times(v_rep) end) as t(hour)
    where v_rep.end_kind <> 'count'
       or (select count(*) from generate_series(v_rep.starts_on, d.day - 1, interval '1 day') g
           where public.repeat_is_day(v_rep, g::date))
          * greatest(cardinality(public.repeat_times(v_rep)), 1)
          + coalesce(array_position(public.repeat_times(v_rep), t.hour), 1) <= v_rep.end_count
    union
    select v_item.due_date,
           case when v_item.kind::text = 'appointment' and v_item.starts_at is not null
                then (v_item.starts_at at time zone 'Asia/Jerusalem')::time
                else v_item.due_time end
    where v_item.due_date between p_from and p_to
  )
  select s.day, s.hour
  from slots s
  where not exists (
    select 1 from public.occurrences o
    where o.item_id = p_item_id and o.on_date = s.day
      and o.at_time is not distinct from s.hour and o.status in ('done', 'skipped'))
  order by s.day, s.hour;
end $$;

revoke all on function public.google_item_slots(uuid, date, date) from public, anon, authenticated;
revoke all on function public.google_enqueue(uuid, uuid) from public, anon, authenticated;
grant execute on function public.google_link_status() to authenticated;
grant execute on function public.google_synced_items() to authenticated;
grant execute on function public.item_is_personal(uuid) to authenticated, service_role;
grant execute on function public.google_item_slots(uuid, date, date) to service_role;
grant select, insert, update, delete
  on public.google_links, public.google_events, public.google_queue to service_role;
