begin;

alter table public.items
rename column published to publish;

alter table public.items
add column if not exists date_published timestamptz;

commit;
