-- ============================================================
-- UtilityHub — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 2. CALCULATIONS (history) ───────────────────────────────
create table if not exists public.calculations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tool_slug   text not null,
  tool_name   text not null,
  inputs      jsonb not null default '{}',
  results     jsonb not null default '{}',
  created_at  timestamptz default now() not null
);

alter table public.calculations enable row level security;

create policy "Users can view own calculations"
  on public.calculations for select
  using (auth.uid() = user_id);

create policy "Users can insert own calculations"
  on public.calculations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own calculations"
  on public.calculations for delete
  using (auth.uid() = user_id);

-- ── 3. PERFORMANCE INDEX ────────────────────────────────────
-- Fast history queries sorted by newest first
create index if not exists idx_calculations_user_created
  on public.calculations(user_id, created_at desc);

-- ── 4. AUTO-CREATE PROFILE ON SIGNUP ────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 5. CAP HISTORY AT 50 ROWS PER USER ──────────────────────
-- Automatically deletes oldest rows beyond 50 to keep DB lean
create or replace function public.cap_user_calculations()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.calculations
  where id in (
    select id from public.calculations
    where user_id = new.user_id
    order by created_at desc
    offset 50
  );
  return new;
end;
$$;

create or replace trigger cap_calculations_per_user
  after insert on public.calculations
  for each row execute procedure public.cap_user_calculations();

-- ── 6. BLOCK ANON FROM WRITING PROFILES ─────────────────────
-- Profiles are only created by the server trigger, never by the client
revoke insert on public.profiles from anon, authenticated;
grant insert on public.profiles to service_role;
