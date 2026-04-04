begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Approved schema normalization:
-- - keep rating as integer
-- - use year instead of year_label
-- - use platform instead of platforms
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cuid text not null unique,
  is_template boolean not null default false,
  type text,
  subtype text,
  title text,
  status text,
  access text not null default 'private',
  area text,
  workbench boolean not null default false,
  resources jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  blocked boolean not null default false,
  slug text,
  published boolean not null default false,
  tier text,
  growth text,
  rating integer,
  series text,
  series_position integer,
  format text,
  medium text,
  genre text,
  platform text,
  collection text,
  source text,
  chains jsonb not null default '[]'::jsonb,
  manuscript text,
  project text,
  principle text,
  course text,
  asset_type text,
  contact_type text,
  contact_status text,
  contacted_last date,
  next_follow_up date,
  deal_status text,
  deal_value numeric,
  institution text,
  instructor text,
  url text,
  isbn text,
  bookmark boolean not null default false,
  repo text,
  stack jsonb not null default '[]'::jsonb,
  modules jsonb not null default '[]'::jsonb,
  be_and_feel jsonb not null default '[]'::jsonb,
  for_sale boolean not null default false,
  price numeric,
  currency text not null default 'CHF',
  sold boolean not null default false,
  exhibited boolean not null default false,
  dimensions text,
  year integer,
  outcome text,
  problem text,
  solution text,
  delivery text,
  lag_measure text,
  lag_target numeric,
  lag_unit text,
  lag_actual numeric not null default 0,
  score_overall numeric,
  week text,
  month text,
  theme text,
  date_delivered timestamptz,
  recording_link text,
  attendees integer not null default 0,
  duration_target text,
  episode integer,
  season integer,
  cover_link text,
  cover_alt_text text,
  certificate_link text,
  unit text,
  target numeric,
  frequency jsonb not null default '[]'::jsonb,
  total_sent integer not null default 0,
  total_comments integer not null default 0,
  total_responses integer not null default 0,
  currency_primary text not null default 'CHF',
  currency_secondary text not null default 'USD',
  month_revenue_chf numeric not null default 0,
  month_expenses_chf numeric not null default 0,
  month_profit_chf numeric not null default 0,
  date_field date,
  mood text,
  chapter_count integer not null default 0,
  issue integer,
  author text,
  subtitle text,
  description text,
  date_start date,
  date_end date,
  content text,
  frontmatter jsonb not null default '{}'::jsonb,
  date_created timestamptz,
  date_modified timestamptz,
  date_trashed timestamptz,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_access_check
    check (access in ('private', 'public', 'paywall')),
  constraint items_tier_requires_paywall_check
    check (tier is null or access = 'paywall'),
  constraint items_user_or_system_template_check
    check (user_id is not null or is_template = true),
  constraint items_resources_array_check
    check (jsonb_typeof(resources) = 'array'),
  constraint items_dependencies_array_check
    check (jsonb_typeof(dependencies) = 'array'),
  constraint items_chains_array_check
    check (jsonb_typeof(chains) = 'array'),
  constraint items_stack_array_check
    check (jsonb_typeof(stack) = 'array'),
  constraint items_modules_array_check
    check (jsonb_typeof(modules) = 'array'),
  constraint items_be_and_feel_array_check
    check (jsonb_typeof(be_and_feel) = 'array'),
  constraint items_frequency_array_check
    check (jsonb_typeof(frequency) = 'array'),
  constraint items_tags_array_check
    check (jsonb_typeof(tags) = 'array'),
  constraint items_frontmatter_object_check
    check (jsonb_typeof(frontmatter) = 'object'),
  constraint items_attendees_nonnegative_check
    check (attendees >= 0),
  constraint items_chapter_count_nonnegative_check
    check (chapter_count >= 0),
  constraint items_total_sent_nonnegative_check
    check (total_sent >= 0),
  constraint items_total_comments_nonnegative_check
    check (total_comments >= 0),
  constraint items_total_responses_nonnegative_check
    check (total_responses >= 0)
);

create table public.item_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  content text not null,
  change_type text not null,
  created_at timestamptz not null default now(),
  constraint item_history_change_type_check
    check (change_type in ('created', 'updated', 'trashed', 'restored'))
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  entry_date date not null,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_logs_item_date_unique unique (item_id, entry_date)
);

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  entry_kind text not null,
  entry_date date not null,
  party text,
  offer text,
  entry_type text,
  currency text,
  amount numeric,
  amount_chf numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_entries_entry_kind_check
    check (entry_kind in ('revenue', 'expense'))
);

create index idx_items_user_date_created
  on public.items (user_id, date_created desc)
  where user_id is not null and date_trashed is null;

create index idx_items_user_date_modified
  on public.items (user_id, date_modified desc)
  where user_id is not null and date_trashed is null;

create index idx_items_user_title
  on public.items (user_id, lower(title))
  where user_id is not null and date_trashed is null;

create index idx_items_user_type_subtype
  on public.items (user_id, type, subtype)
  where user_id is not null and date_trashed is null;

create index idx_items_inbox_lookup
  on public.items (user_id, created_at desc)
  where type = 'inbox' and status = 'unprocessed' and date_trashed is null;

create index idx_items_user_templates
  on public.items (user_id, type, subtype)
  where user_id is not null and is_template = true and date_trashed is null;

create index idx_items_system_templates
  on public.items (type, subtype)
  where user_id is null and is_template = true and date_trashed is null;

create index idx_items_trash
  on public.items (user_id, date_trashed desc)
  where user_id is not null and date_trashed is not null;

create index idx_items_title_trgm
  on public.items using gin (title extensions.gin_trgm_ops);

create index idx_items_content_trgm
  on public.items using gin (content extensions.gin_trgm_ops);

create index idx_items_frontmatter_gin
  on public.items using gin (frontmatter jsonb_path_ops);

create index idx_items_tags_gin
  on public.items using gin (tags);

create index idx_item_history_item_created_at
  on public.item_history (item_id, created_at desc);

create index idx_habit_logs_item_entry_date
  on public.habit_logs (item_id, entry_date desc);

create index idx_finance_entries_item_kind_entry_date
  on public.finance_entries (item_id, entry_kind, entry_date desc);

create trigger set_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create trigger set_habit_logs_updated_at
before update on public.habit_logs
for each row
execute function public.set_updated_at();

create trigger set_finance_entries_updated_at
before update on public.finance_entries
for each row
execute function public.set_updated_at();

alter table public.items enable row level security;
alter table public.item_history enable row level security;
alter table public.habit_logs enable row level security;
alter table public.finance_entries enable row level security;

create policy "items_select_own_or_system_templates"
  on public.items
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (is_template = true and user_id is null)
  );

create policy "items_insert_own_rows"
  on public.items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "items_update_own_rows"
  on public.items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "items_delete_own_rows"
  on public.items
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "item_history_select_own_rows"
  on public.item_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = item_history.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "item_history_insert_own_rows"
  on public.item_history
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.items
      where items.id = item_history.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "habit_logs_select_own_rows"
  on public.habit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = habit_logs.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "habit_logs_insert_own_rows"
  on public.habit_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.items
      where items.id = habit_logs.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "habit_logs_update_own_rows"
  on public.habit_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = habit_logs.item_id
        and items.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.items
      where items.id = habit_logs.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "habit_logs_delete_own_rows"
  on public.habit_logs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = habit_logs.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "finance_entries_select_own_rows"
  on public.finance_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = finance_entries.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "finance_entries_insert_own_rows"
  on public.finance_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.items
      where items.id = finance_entries.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "finance_entries_update_own_rows"
  on public.finance_entries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = finance_entries.item_id
        and items.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.items
      where items.id = finance_entries.item_id
        and items.user_id = auth.uid()
    )
  );

create policy "finance_entries_delete_own_rows"
  on public.finance_entries
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.items
      where items.id = finance_entries.item_id
        and items.user_id = auth.uid()
    )
  );

commit;
