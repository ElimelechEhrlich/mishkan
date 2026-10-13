-- =====================================================================
-- 0020 - Data on an item
-- A note or an issue can hold named values ("נתונים"), such as the gate's
-- code: 1234, or how much was paid so far. Each row is a name and a value;
-- they keep their order of adding. They belong to the item: whoever can see
-- the item sees them, and they stay with it through any conversion.
-- Nothing that exists is changed.
-- Run once in the Supabase SQL editor, after 0019.
-- =====================================================================

create table public.item_data (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  label      text not null check (length(trim(label)) > 0),
  value      text not null default '',
  created_at timestamptz not null default now()
);
create index item_data_item_idx on public.item_data (item_id, created_at);

alter table public.item_data enable row level security;

-- Like the item's other parts: they follow the item.
create policy item_data_all on public.item_data for all to authenticated
  using (public.can_see_item(item_id))
  with check (public.can_see_item(item_id));

grant select, insert, update, delete on public.item_data to authenticated;
