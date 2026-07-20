create extension if not exists pgcrypto;

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_id uuid references public.protocols(id) on delete set null,
  status text not null default 'not_started',
  current_step integer not null default 0,
  run_data jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  title text not null,
  markdown text not null,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiments_user_id_updated_at_idx
on public.experiments(user_id, updated_at desc);

create index if not exists experiments_user_id_status_idx
on public.experiments(user_id, status);

create index if not exists experiment_reports_user_id_updated_at_idx
on public.experiment_reports(user_id, updated_at desc);

create index if not exists experiment_reports_user_id_experiment_id_idx
on public.experiment_reports(user_id, experiment_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_experiments_updated_at on public.experiments;
create trigger set_experiments_updated_at
before update on public.experiments
for each row
execute function public.set_updated_at();

drop trigger if exists set_experiment_reports_updated_at on public.experiment_reports;
create trigger set_experiment_reports_updated_at
before update on public.experiment_reports
for each row
execute function public.set_updated_at();

alter table public.experiments enable row level security;
alter table public.experiment_reports enable row level security;

drop policy if exists "Users can read their own experiments" on public.experiments;
drop policy if exists "Users can insert their own experiments" on public.experiments;
drop policy if exists "Users can update their own experiments" on public.experiments;
drop policy if exists "Users can delete their own experiments" on public.experiments;

create policy "Users can read their own experiments"
on public.experiments
for select
using (auth.uid() = user_id);

create policy "Users can insert their own experiments"
on public.experiments
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own experiments"
on public.experiments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own experiments"
on public.experiments
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their own experiment reports" on public.experiment_reports;
drop policy if exists "Users can insert their own experiment reports" on public.experiment_reports;
drop policy if exists "Users can update their own experiment reports" on public.experiment_reports;
drop policy if exists "Users can delete their own experiment reports" on public.experiment_reports;

create policy "Users can read their own experiment reports"
on public.experiment_reports
for select
using (auth.uid() = user_id);

create policy "Users can insert their own experiment reports"
on public.experiment_reports
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own experiment reports"
on public.experiment_reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own experiment reports"
on public.experiment_reports
for delete
using (auth.uid() = user_id);
