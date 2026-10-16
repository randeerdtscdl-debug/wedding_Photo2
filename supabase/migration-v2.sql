-- =====================================================================
-- v2 UPGRADE — run this ONCE in Supabase → SQL Editor
-- (after migration.sql). Adds: approval queue + video support.
-- =====================================================================

-- 1. Photos/videos: new uploads wait for host approval -----------------
alter table public.posts add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video'));

alter table public.posts alter column is_approved set default false;

-- Guests may only insert posts that are NOT yet approved
drop policy if exists "insert own post" on public.posts;
create policy "insert own post" on public.posts
  for insert to authenticated
  with check (user_id = auth.uid() and is_approved = false);

-- (select policy from v1 already shows approved posts to everyone,
--  and a guest's own pending posts only to that guest)

-- 2. Storage: allow videos, 50 MB per file -----------------------------
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
where id = 'wedding-photos';

-- NOTE: Supabase's global upload limit is 50 MB on the Free plan
-- (Project Settings → Storage). Pro plan lets you raise it.
