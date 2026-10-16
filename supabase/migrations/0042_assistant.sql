-- =====================================================================
-- 0042 - The assistant's conversation
-- Each parent has a conversation of their own with the assistant (an AI that
-- adds items and answers about them). Its turns are kept here, so it follows
-- what was said before; only the parent who wrote them sees them.
-- Run once in the Supabase SQL editor, after 0041.
-- =====================================================================

create table public.assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
               references public.households(id) on delete cascade,
  member_id    uuid not null default public.current_member_id()
               references public.members(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  text         text not null check (length(text) > 0),
  created_at   timestamptz not null default clock_timestamp()
);
create index assistant_messages_member_idx on public.assistant_messages (member_id, created_at);

alter table public.assistant_messages enable row level security;

create policy assistant_messages_own on public.assistant_messages for all to authenticated
  using (member_id = public.current_member_id())
  with check (
    member_id = public.current_member_id()
    and household_id = public.current_household_id()
  );

grant select, insert, delete on public.assistant_messages to authenticated;
