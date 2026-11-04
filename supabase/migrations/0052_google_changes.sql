-- =====================================================================
-- 0052 - Changes made in Google come back to the app
-- The google-calendar function now also reads what changed in the "משכן"
-- calendar since its last look (Google's sync token), and brings back what
-- a parent changed there: an appointment's time, title, place and
-- reminders, a series' hour and rule, the move of the current occurrence,
-- and the time of a 🔔 reminder. Removing an event there only takes it out
-- of the calendar. To tell a parent's change from its own, the function
-- keeps what it sent (and Google's etag for it).
-- A series' rule and an occurrence's move go through the app's own
-- functions, as the parent who connected the account.
-- Run once in the Supabase SQL editor, after 0051.
-- =====================================================================

alter table public.google_links
  -- Google's mark of the last look at the calendar's changes.
  add column sync_token text;

alter table public.google_events
  -- What was sent, and Google's version of it then.
  add column sent      jsonb,
  add column etag      text,
  -- Removed in Google by a parent: not made again (a 🔔 reminder; it stays in the app).
  add column dismissed boolean not null default false;

-- Runs the rest of the call as a parent of the household (the one who connected it), so the
-- app's own functions, which act for the parent signed in, can be used.
create function public.google_act_as(p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.members where id = p_member_id;
  if v_user is null then
    raise exception 'no such parent';
  end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
end $$;

-- The current occurrence of a series moved in Google.
create function public.google_move_occurrence(
  p_member_id uuid,
  p_item_id   uuid,
  p_date      date,
  p_time      time
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.google_act_as(p_member_id);
  perform public.move_occurrence(p_item_id, p_date, p_time);
end $$;

-- A series' hour or rule changed in Google; the rest of it stays as it was.
create function public.google_save_repeat(
  p_member_id uuid,
  p_item_id   uuid,
  p_every     integer,
  p_unit      public.repeat_unit,
  p_times     time[],
  p_weekdays  smallint[],
  p_end_kind  public.repeat_end,
  p_end_count integer,
  p_end_until date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_rep public.item_repeats%rowtype;
begin
  perform public.google_act_as(p_member_id);
  select * into v_rep from public.item_repeats where item_id = p_item_id;
  if v_rep.item_id is null then
    raise exception 'the item does not repeat';
  end if;
  perform public.save_repeat(p_item_id, p_every, p_unit, v_rep.starts_on, p_times, p_weekdays,
    v_rep.from_kind, p_end_kind, p_end_count, p_end_until, v_rep.tracker_closes);
end $$;

revoke all on function public.google_act_as(uuid) from public, anon, authenticated;
revoke all on function public.google_move_occurrence(uuid, uuid, date, time)
  from public, anon, authenticated;
revoke all on function public.google_save_repeat(uuid, uuid, integer, public.repeat_unit, time[],
  smallint[], public.repeat_end, integer, date) from public, anon, authenticated;
grant execute on function public.google_move_occurrence(uuid, uuid, date, time) to service_role;
grant execute on function public.google_save_repeat(uuid, uuid, integer, public.repeat_unit,
  time[], smallint[], public.repeat_end, integer, date) to service_role;
