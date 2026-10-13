-- =====================================================================
-- 0022 - Trackers
-- A tracker ("מעקב") is an item with entries: each a date, a value and an
-- optional note, such as payments on a project or a child's weight. It sums
-- them up as the parent chooses: the total, the latest, or not at all, with
-- an optional unit (₪, kg, cm). A tracker stands on its own (in the notes
-- tab) or inside an issue, beside its steps and questions; an issue can hold
-- several. Entries follow the tracker's visibility and stay with it through
-- any conversion. Nothing that exists is changed: the two functions below
-- are the same as before, with trackers allowed inside an issue.
-- Run once in the Supabase SQL editor, after 0021.
-- =====================================================================

alter table public.items
  add column tracker_unit text,
  add column tracker_summary text not null default 'sum'
    check (tracker_summary in ('sum', 'latest', 'none'));

create table public.tracker_entries (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  on_date    date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  value      text not null check (length(trim(value)) > 0),
  note       text,
  created_at timestamptz not null default now()
);
create index tracker_entries_item_idx on public.tracker_entries (item_id, on_date);

alter table public.tracker_entries enable row level security;

create policy tracker_entries_all on public.tracker_entries for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

grant select, insert, update, delete on public.tracker_entries to authenticated;

-- An issue may hold trackers, as it holds steps and questions.
create or replace function public.items_before_write() returns trigger
language plpgsql as $$
declare
  v_parent public.items%rowtype;
begin
  if tg_op = 'INSERT' then
    new.household_id := coalesce(new.household_id, public.current_household_id());
    new.created_by   := coalesce(new.created_by, public.current_member_id());
    new.review_by    := coalesce(new.review_by, new.created_by);
  else
    new.household_id := old.household_id;
    new.created_by   := old.created_by;
  end if;

  if new.kind = 'question' and new.parent_id is null then
    raise exception 'a question must belong to an issue';
  end if;

  if new.parent_id is not null then
    select * into v_parent from public.items where id = new.parent_id;
    if not found then
      raise exception 'parent item not found';
    end if;

    if tg_op = 'INSERT'
       or new.parent_id is distinct from old.parent_id
       or new.kind is distinct from old.kind then
      if v_parent.household_id <> new.household_id then
        raise exception 'parent item belongs to another household';
      end if;
      if v_parent.parent_id is not null then
        raise exception 'only two levels are allowed: a step cannot have steps';
      end if;
      if v_parent.kind not in ('goal', 'issue') then
        raise exception 'only a goal or an issue can have steps';
      end if;
      if not (new.kind = 'task'
              or (new.kind in ('question', 'tracker') and v_parent.kind = 'issue')) then
        raise exception 'a step must be a task, or a question or a tracker of an issue';
      end if;
      if tg_op = 'UPDATE' and exists (select 1 from public.items c where c.parent_id = new.id) then
        raise exception 'an item that has steps cannot become a step';
      end if;
    end if;

    new.domain_id := v_parent.domain_id;
  end if;

  -- once assigned, the hint from the old structure is no longer needed
  if new.domain_id is not null then
    new.previous_domain_label := null;
  end if;

  -- completion bookkeeping
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.completed_by := coalesce(new.completed_by, public.current_member_id());
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end $$;

-- Steps are shown only while their parent can hold them: tasks under a goal or
-- an issue, questions and trackers under an issue. Otherwise they are kept,
-- hidden, until it can again.
create or replace function public.items_sync_hidden_steps() returns trigger
language plpgsql as $$
begin
  update public.items c
  set hidden = not (
    (new.kind = 'goal'  and c.kind = 'task')
    or (new.kind = 'issue' and c.kind in ('task', 'question', 'tracker'))
  )
  where c.parent_id = new.id;
  return null;
end $$;
