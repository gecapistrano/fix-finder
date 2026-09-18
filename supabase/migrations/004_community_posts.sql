-- Community posts — separate from public.scans (Fix Finder / GenAI logs).
-- No login. Anyone can read the feed. Inserts happen after Gemini moderation.
-- Photos live in Storage, not in this table.
--
-- Run this once in the SQL editor:
-- https://supabase.com/dashboard/project/dpfapjilkkefwaxxaunj/sql/new
--
-- Then confirm:
-- Table:   https://supabase.com/dashboard/project/dpfapjilkkefwaxxaunj/editor
-- Storage: https://supabase.com/dashboard/project/dpfapjilkkefwaxxaunj/storage/buckets

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  author text not null default '',
  product text not null default '',
  note text not null,
  before_url text not null,
  after_url text not null
);

alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
on public.posts
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can insert posts" on public.posts;
create policy "Anyone can insert posts"
on public.posts
for insert
to anon, authenticated
with check (true);

grant select, insert on table public.posts to anon, authenticated;

-- Public bucket for before/after photos. 2 MB per file. JPEG/PNG/WebP only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-posts',
  'community-posts',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert on table storage.objects to anon, authenticated;

drop policy if exists "Public read community post photos" on storage.objects;
create policy "Public read community post photos"
on storage.objects
for select
to public
using (bucket_id = 'community-posts');

drop policy if exists "Anon upload community post photos" on storage.objects;
create policy "Anon upload community post photos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'community-posts');
