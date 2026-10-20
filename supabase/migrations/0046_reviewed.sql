-- =====================================================================
-- 0046 - When an item with no date was last looked at
-- The home page asks once a day about one item with no date or on the
-- shelf, the one longest not looked at: "עוד רלוונטי?". Whatever the answer
-- (for today, a date, on the shelf, keep as is), it is marked looked at,
-- and the next one comes up.
-- Run once in the Supabase SQL editor, after 0045.
-- =====================================================================

alter table public.items add column reviewed_at timestamptz;
