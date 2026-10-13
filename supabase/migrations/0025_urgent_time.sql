-- =====================================================================
-- 0025 - A time mode for what is urgent but has no date ("דחוף")
-- Only adds the value; 0026 uses it. A new value cannot be used in the
-- same run that adds it, so this runs on its own, first.
-- Run once in the Supabase SQL editor, after 0024.
-- =====================================================================

alter type public.item_time_mode add value if not exists 'urgent';
