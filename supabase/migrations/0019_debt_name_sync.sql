-- =====================================================================
-- 0019 - A debt's details follow its edits
-- A debt's details keep the name of whom it is with, set when it was made.
-- Renaming the debt now renames them too, and the debts renamed before this
-- are brought in line once.
-- Run once in the Supabase SQL editor, after 0018.
-- =====================================================================

create function public.items_sync_debt_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.debt_details
  set counterparty = new.title
  where item_id = new.id and counterparty is distinct from new.title;
  return null;
end $$;

create trigger items_sync_debt_name
  after update of title on public.items
  for each row when (new.kind = 'debt' and old.title is distinct from new.title)
  execute function public.items_sync_debt_name();

update public.debt_details d
set counterparty = i.title
from public.items i
where i.id = d.item_id
  and i.kind = 'debt'
  and d.counterparty is distinct from i.title;
