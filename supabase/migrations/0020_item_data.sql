-- =====================================================================
-- 0020 - Rows in a note or an issue, and a note that is one value
-- A note or an issue can hold rows, in the order they were added, which can be
-- changed where order matters (such as the steps of a recipe). A row is
-- either a line of text ("heat the oven to 180") or a named value ("flour:
-- 2 cups", "the gate's code: 1234"). The rows belong to the item: whoever can
-- see the item sees them, and they stay with it through any conversion.
-- A note can also be a value of its own ("נתון"): its title is the name and
-- its answer the value, such as the gate's code: 1234.
-- Nothing that exists is changed.
-- Run once in the Supabase SQL editor, after 0019.
-- =====================================================================

create table public.item_data (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  -- The name of a value; null for a line of text.
  label      text check (label is null or length(trim(label)) > 0),
  value      text not null default '',
  -- Where the row stands among the item's rows; a new one goes last.
  position   double precision not null default extract(epoch from clock_timestamp()),
  created_at timestamptz not null default now(),
  -- A line of text is not empty.
  constraint item_data_line_has_text check (label is not null or length(trim(value)) > 0)
);
create index item_data_item_idx on public.item_data (item_id, position);

alter table public.item_data enable row level security;

-- Like the item's other parts: they follow the item.
create policy item_data_all on public.item_data for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

grant select, insert, update, delete on public.item_data to authenticated;

-- A note that is one value: its title is the name, its answer the value.
alter table public.items add column is_value boolean not null default false;
