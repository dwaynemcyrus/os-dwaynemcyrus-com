begin;

alter table public.items
  add column if not exists todos_open integer not null default 0,
  add column if not exists todos_done integer not null default 0,
  add column if not exists is_pinned boolean not null default false;

create index if not exists items_todos_open_idx
  on public.items (user_id, todos_open)
  where todos_open > 0;

create index if not exists items_is_pinned_idx
  on public.items (user_id, is_pinned)
  where is_pinned = true;

commit;
