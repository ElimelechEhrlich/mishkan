-- =====================================================================
-- 0021 - A new kind of item: a tracker ("מעקב")
-- Only adds the kind; 0022 gives it its entries and settings. A new kind
-- has to be added on its own, before anything uses it.
-- Run once in the Supabase SQL editor, after 0020.
-- =====================================================================

alter type public.item_kind add value if not exists 'tracker';
