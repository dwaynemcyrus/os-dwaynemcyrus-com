-- Add source-specific columns to items table
alter table public.items
  add column if not exists archived_at timestamptz,
  add column if not exists normalized_url text,
  add column if not exists site_name text,
  add column if not exists favicon_url text,
  add column if not exists source_type text;

-- Add link_template_id to user_settings (mirrors daily_template_id pattern)
alter table public.user_settings
  add column if not exists link_template_id uuid references public.items(id) on delete set null;

-- Unique index for URL-based source dedupe (excludes trashed items)
create unique index if not exists idx_items_user_normalized_url_unique
  on public.items (user_id, normalized_url)
  where user_id is not null
    and normalized_url is not null
    and date_trashed is null;

-- Unique index for ISBN-based book dedupe (excludes trashed items)
create unique index if not exists idx_items_user_isbn_unique
  on public.items (user_id, isbn)
  where user_id is not null
    and isbn is not null
    and date_trashed is null;
