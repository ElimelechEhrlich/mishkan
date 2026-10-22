-- =====================================================================
-- 0048 - Every year on a Hebrew date, for any item
-- An item can repeat every year on a Hebrew date (a day and a month, such
-- as כ״ו באייר), like the Hebrew birthdays of 0036, but set on the item's
-- own page: an anniversary, a memorial (אזכרה), a yearly event. The app
-- works out the civil days of the years ahead and sends them; the series
-- follows them, with its reminders and hours as any series. A date in Adar
-- of a plain year falls, in a leap year, in the Adar chosen (I or II).
-- Choosing another rhythm later drops the Hebrew days.
-- Run once in the Supabase SQL editor, after 0047.
-- =====================================================================

alter table public.item_repeats
  -- The Hebrew date the series keeps, by the calendar's month names (Tishri .. Elul, Adar I/II).
  add column hebrew_month     text,
  add column hebrew_day       smallint check (hebrew_day between 1 and 30),
  -- For Adar of a plain year: which Adar it falls in, in a leap year.
  add column hebrew_leap_adar text check (hebrew_leap_adar in ('Adar I', 'Adar II'));

-- Makes an item repeat every year on a Hebrew date, on the days given (the years ahead), at
-- the hours given; or changes it. What was marked stays, as with any series.
create function public.save_hebrew_repeat(
  p_item_id   uuid,
  p_month     text,
  p_day       smallint,
  p_leap_adar text,
  p_dates     date[],
  p_times     time[]
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_dates date[] := coalesce(array(select distinct d from unnest(p_dates) as d
                                   where d is not null order by d), '{}');
  v_start date;
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  if cardinality(v_dates) = 0 or p_month is null or p_day is null then
    raise exception 'a Hebrew date needs its month, its day and its days';
  end if;
  v_start := least(v_dates[1], public.today_in_israel());

  -- The days first, so the series is reckoned by them.
  insert into public.item_repeats as r
    (item_id, every, unit, starts_on, dates, hebrew, hebrew_month, hebrew_day,
     hebrew_leap_adar, missed_from, updated_at)
  values (p_item_id, 1, 'year', v_start, v_dates, true, p_month, p_day, p_leap_adar,
          public.today_in_israel(), now())
  on conflict (item_id) do update
    set dates = excluded.dates, hebrew = true, hebrew_month = excluded.hebrew_month,
        hebrew_day = excluded.hebrew_day, hebrew_leap_adar = excluded.hebrew_leap_adar,
        updated_at = now();

  perform public.save_repeat(p_item_id, 1, 'year', v_start, p_times, '{}', 'schedule',
                             'never', null, null, false);
end $$;

-- Another rhythm chosen for an item that kept a Hebrew date: the Hebrew days are let go.
-- Hebrew birthdays from a profile (no month kept here) are not touched.
create function public.clear_hebrew_repeat(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_see_item(p_item_id) then
    raise exception 'item not found';
  end if;
  update public.item_repeats
  set dates = '{}', hebrew = false, hebrew_month = null, hebrew_day = null,
      hebrew_leap_adar = null
  where item_id = p_item_id and hebrew_month is not null;
end $$;

revoke execute on function public.save_hebrew_repeat(uuid, text, smallint, text, date[], time[])
  from public, anon;
grant execute on function public.save_hebrew_repeat(uuid, text, smallint, text, date[], time[])
  to authenticated;
revoke execute on function public.clear_hebrew_repeat(uuid) from public, anon;
grant execute on function public.clear_hebrew_repeat(uuid) to authenticated;
