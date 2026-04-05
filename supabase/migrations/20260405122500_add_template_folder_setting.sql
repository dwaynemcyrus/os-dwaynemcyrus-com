begin;

alter table public.user_settings
add column if not exists template_folder text;

commit;
