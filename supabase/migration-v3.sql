-- =====================================================================
-- v3 UPGRADE — run this ONCE in Supabase → SQL Editor
-- (after migration.sql and migration-v2.sql). Safe to re-run.
-- Adds: profile picture, private phone number, voice wishes.
-- =====================================================================

-- 1. Profile picture ----------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- 2. Phone number — PRIVATE (only the guest themself + host dashboard) ---
create table if not exists public.guest_contacts (
  id         uuid primary key references public.profiles(id) on delete cascade,
  phone      text not null check (char_length(phone) between 9 and 16),
  created_at timestamptz not null default now()
);
alter table public.guest_contacts enable row level security;

drop policy if exists "read own contact"   on public.guest_contacts;
drop policy if exists "insert own contact" on public.guest_contacts;
drop policy if exists "update own contact" on public.guest_contacts;
create policy "read own contact"   on public.guest_contacts for select to authenticated using (id = auth.uid());
create policy "insert own contact" on public.guest_contacts for insert to authenticated with check (id = auth.uid());
create policy "update own contact" on public.guest_contacts for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 3. Voice wishes (posts with media_type = 'audio') ---------------------
alter table public.posts add column if not exists duration_sec integer
  check (duration_sec is null or duration_sec between 0 and 600);

alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check
  check (media_type in ('image', 'video', 'audio'));

create index if not exists posts_type_idx on public.posts (media_type, created_at desc);

-- 4. Storage: also allow audio files -------------------------------------
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp',
  'video/mp4','video/quicktime','video/webm',
  'audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/x-m4a','audio/aac','audio/wav'
]
where id = 'wedding-photos';
