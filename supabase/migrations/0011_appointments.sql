-- =====================================================================
-- 0011 - Appointments and meetings
-- A new item kind with a start date and time (required), where it happens (in
-- person with an address, by phone with a number, or by video with a link),
-- and whom it is with. A series (every week, every two weeks, every month) is
-- made as separate appointments that share a series id, so each can be moved
-- or cancelled alone. Each appointment reminds a day before and an hour before.
-- Run once in the Supabase SQL editor, after 0010.
-- =====================================================================

alter type public.item_kind add value if not exists 'appointment';

create type public.meeting_place as enum ('in_person', 'phone', 'video');

alter table public.items
  add column starts_at   timestamptz,
  add column place_kind  public.meeting_place,
  add column place       text,
  add column meeting_url text,
  add column with_whom   text,
  add column series_id   uuid;

create index items_series_idx on public.items (series_id) where series_id is not null;

-- An appointment is listed on its day in Israel, whenever its time is set or moved.
create function public.items_appointment_day() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind::text = 'appointment' and new.starts_at is not null then
    new.due_date := (new.starts_at at time zone 'Asia/Jerusalem')::date;
    new.time_mode := 'scheduled';
  end if;
  return new;
end $$;

create trigger items_appointment_day
  before insert or update of starts_at, kind on public.items
  for each row execute function public.items_appointment_day();

-- ---------- Reminders: a day before and an hour before ----------------
create table public.appointment_reminders (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.items(id) on delete cascade,
  remind_at timestamptz not null,
  lead      text not null check (lead in ('day', 'hour')),
  sent_at   timestamptz
);
create index appointment_reminders_due_idx on public.appointment_reminders (remind_at)
  where sent_at is null;

-- Only the functions below touch it.
alter table public.appointment_reminders enable row level security;

-- An appointment keeps its reminders in step with its time; ones not sent yet are
-- made again whenever the time changes, and only those still ahead are kept.
create function public.items_appointment_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.appointment_reminders where item_id = new.id and sent_at is null;
  if new.kind::text = 'appointment' and new.starts_at is not null then
    insert into public.appointment_reminders (item_id, remind_at, lead)
    select new.id, r.at, r.lead
    from (values (new.starts_at - interval '1 day', 'day'),
                 (new.starts_at - interval '1 hour', 'hour')) as r(at, lead)
    where r.at > now();
  end if;
  return new;
end $$;

create trigger items_appointment_reminders
  after insert or update of starts_at, kind on public.items
  for each row execute function public.items_appointment_reminders();

-- ---------- Making appointments, one or a series ----------------------
-- Every start time becomes its own appointment; with more than one they share a
-- series id. The date the lists group it by is its day in Israel.
create function public.create_appointments(
  p_title       text,
  p_domain_id   uuid,
  p_starts      timestamptz[],
  p_place_kind  public.meeting_place,
  p_place       text,
  p_meeting_url text,
  p_with_whom   text
) returns integer
language plpgsql set search_path = '' as $$
declare
  v_series uuid := case when cardinality(p_starts) > 1 then gen_random_uuid() end;
  v_start  timestamptz;
  v_count  integer := 0;
begin
  if cardinality(p_starts) is null or cardinality(p_starts) = 0 then
    raise exception 'an appointment needs a date and time';
  end if;
  if cardinality(p_starts) > 104 then
    raise exception 'too many appointments at once';
  end if;
  foreach v_start in array p_starts loop
    insert into public.items
      (title, kind, domain_id, time_mode, due_date, starts_at,
       place_kind, place, meeting_url, with_whom, series_id)
    values
      (p_title, 'appointment', p_domain_id, 'scheduled',
       (v_start at time zone 'Asia/Jerusalem')::date, v_start,
       p_place_kind, nullif(trim(p_place), ''), nullif(trim(p_meeting_url), ''),
       nullif(trim(p_with_whom), ''), v_series);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

grant execute on function public.create_appointments(
  text, uuid, timestamptz[], public.meeting_place, text, text, text
) to authenticated;

-- ---------- Sending: appointment reminders join the others -----------
create or replace function public.claim_due_reminders()
returns table (item_id uuid, title text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = '' as $$
  with due_items as (
    update public.items i
    set reminder_sent_at = now()
    where i.remind_at <= now()
      and i.reminder_sent_at is null
      and i.status = 'open'
      and i.hidden = false
    returning i.id, i.title, i.household_id, i.domain_id, i.review_by, i.remind_member_ids
  ),
  due_appointments as (
    update public.appointment_reminders r
    set sent_at = now()
    from public.items i
    where r.item_id = i.id
      and r.remind_at <= now()
      and r.sent_at is null
      and i.status = 'open'
      and i.hidden = false
    returning i.id,
      case r.lead
        when 'day' then 'מחר ב־' || to_char(i.starts_at at time zone 'Asia/Jerusalem', 'HH24:MI')
        else 'בעוד שעה'
      end || ' · ' || i.title as title,
      i.household_id, i.domain_id, i.review_by, i.remind_member_ids
  ),
  due as (
    select * from due_items
    union all
    select * from due_appointments
  ),
  recipients as (
    select d.id, d.title, m.id as member_id
    from due d
    join public.members m on m.household_id = d.household_id and m.user_id is not null
    left join public.domains dm on dm.id = d.domain_id
    left join public.entities e on e.id = dm.entity_id
    where ((d.domain_id is null and m.id = d.review_by)
        or (d.domain_id is not null and (e.kind <> 'personal' or e.member_id = m.id)))
      and (d.remind_member_ids is null or m.id = any (d.remind_member_ids))
  )
  select r.id, r.title, s.endpoint, s.p256dh, s.auth
  from recipients r
  join public.push_subscriptions s on s.member_id = r.member_id
$$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
