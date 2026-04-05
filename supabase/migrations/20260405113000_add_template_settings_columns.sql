begin;

alter table public.items
add column if not exists folder text;

alter table public.user_settings
add column if not exists template_date_format text;

alter table public.user_settings
add column if not exists template_time_format text;

commit;
