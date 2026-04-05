begin;

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_template_id uuid references public.items(id) on delete set null,
  template_folder text,
  template_date_format text,
  template_time_format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "user_settings_select_own_rows"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "user_settings_insert_own_rows"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy "user_settings_update_own_rows"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_settings_delete_own_rows"
on public.user_settings
for delete
using (auth.uid() = user_id);

commit;
