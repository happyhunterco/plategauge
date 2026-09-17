-- PlateGauge schema: one profile row per user, food log entries, row-level security.
-- Deleting the auth user (Profile → Delete account) cascades to every row below.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb,
  goals jsonb,
  goals_manual boolean not null default false,
  settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_entries_user_day on public.food_entries (user_id, day desc);

alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "own entries" on public.food_entries;
create policy "own entries" on public.food_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Entries can't be moved to another user after insert.
create or replace function public.food_entries_lock_owner() returns trigger
language plpgsql as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists food_entries_lock_owner on public.food_entries;
create trigger food_entries_lock_owner before update on public.food_entries
  for each row execute function public.food_entries_lock_owner();
