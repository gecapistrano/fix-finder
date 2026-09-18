-- Run this once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Then Table Editor → scans will show every Fix Finder analysis.

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_context text,
  object text,
  material text,
  damage text,
  recommended_product text
);

alter table public.scans enable row level security;

drop policy if exists "Allow anonymous inserts on scans" on public.scans;
create policy "Allow anonymous inserts on scans"
on public.scans
for insert
to anon, authenticated
with check (true);

grant insert on table public.scans to anon, authenticated;
