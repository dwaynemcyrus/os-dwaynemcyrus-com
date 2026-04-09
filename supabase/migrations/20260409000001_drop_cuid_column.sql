-- Remove the client-generated cuid column.
-- The Supabase id (uuid primary key default gen_random_uuid()) is the
-- single stable identifier for all items going forward.

alter table public.items
  drop column if exists cuid;
