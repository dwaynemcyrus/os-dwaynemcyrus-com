begin;

alter table public.items
  drop column if exists processed;

commit;
