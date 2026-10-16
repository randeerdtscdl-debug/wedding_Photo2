-- =====================================================================
-- Wedding Live Photo Feed — Supabase migration
-- Run in: Supabase Dashboard → SQL Editor
-- BEFORE running: Authentication → Providers → enable "Anonymous Sign-Ins"
-- =====================================================================

-- 1. TABLES ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  guest_name   text not null check (char_length(guest_name) between 1 and 60),
  table_number text not null check (char_length(table_number) between 1 and 10),
  created_at   timestamptz not null default now()
);

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  image_url    text not null,
  storage_path text not null,                       -- lets admin delete the file too
  caption      text check (char_length(caption) <= 280),
  table_number text not null,
  is_approved  boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  comment_text text not null check (char_length(comment_text) between 1 and 500),
  created_at   timestamptz not null default now()
);

create index if not exists posts_created_idx    on public.posts (created_at desc);
create index if not exists posts_table_idx      on public.posts (table_number);
create index if not exists likes_post_idx       on public.likes (post_id);
create index if not exists comments_post_idx    on public.comments (post_id, created_at);

-- 2. ROW LEVEL SECURITY -------------------------------------------------
-- (Admin actions use the service-role key on the server, which bypasses RLS.)
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

-- profiles
create policy "profiles readable by all"   on public.profiles for select using (true);
create policy "insert own profile"         on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile"         on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- posts: everyone sees approved posts; owners also see their own
create policy "approved posts readable"    on public.posts for select using (is_approved or user_id = auth.uid());
create policy "insert own post"            on public.posts for insert to authenticated with check (user_id = auth.uid() and is_approved = true);
create policy "delete own post"            on public.posts for delete to authenticated using (user_id = auth.uid());

-- likes
create policy "likes readable by all"      on public.likes for select using (true);
create policy "insert own like"            on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "delete own like"            on public.likes for delete to authenticated using (user_id = auth.uid());

-- comments
create policy "comments readable by all"   on public.comments for select using (true);
create policy "insert own comment"         on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "delete own comment"         on public.comments for delete to authenticated using (user_id = auth.uid());

-- 3. STORAGE ------------------------------------------------------------
-- New bucket (separate from any existing one). Public read → fast CDN URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "wedding photos public read"
  on storage.objects for select
  using (bucket_id = 'wedding-photos');

create policy "guests upload into own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "guests delete own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'wedding-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. REALTIME -----------------------------------------------------------
alter publication supabase_realtime add table public.posts, public.likes, public.comments;
-- FULL replica identity so DELETE events carry post_id / user_id (needed for live counters)
alter table public.likes    replica identity full;
alter table public.comments replica identity full;
