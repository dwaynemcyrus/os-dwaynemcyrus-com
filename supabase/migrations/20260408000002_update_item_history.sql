-- Add user_id and frontmatter to item_history for full history snapshots
alter table public.item_history
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists frontmatter jsonb;

create index if not exists idx_item_history_user_id
  on public.item_history (user_id, created_at desc)
  where user_id is not null;
