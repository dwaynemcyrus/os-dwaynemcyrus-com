begin;

alter table public.user_settings
add column if not exists daily_note_folder text;

commit;
