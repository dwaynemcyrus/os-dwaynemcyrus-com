begin;

alter table public.items
  add column if not exists filename text;

create unique index if not exists idx_items_user_filename_unique
  on public.items (user_id, filename)
  where user_id is not null and filename is not null and date_trashed is null;

commit;
