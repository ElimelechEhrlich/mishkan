-- =====================================================================
-- 0051 - One send to Google at a time
-- The cron job and the app may both ask to send a household's queue. Two
-- sends at once could make the same event twice, so a send first takes the
-- household's turn (for two minutes at most) and gives it back when done.
-- Run once in the Supabase SQL editor, after 0050.
-- =====================================================================

alter table public.google_links add column sending_until timestamptz;

-- Takes the household's turn to send, unless another send holds it.
create function public.google_take_turn(p_household_id uuid) returns boolean
language sql security definer set search_path = '' as $$
  with taken as (
    update public.google_links
    set sending_until = now() + interval '2 minutes'
    where household_id = p_household_id
      and (sending_until is null or sending_until < now())
    returning 1
  )
  select exists (select 1 from taken)
$$;

revoke all on function public.google_take_turn(uuid) from public, anon, authenticated;
grant execute on function public.google_take_turn(uuid) to service_role;
