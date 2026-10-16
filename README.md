# Umini & Randeera — Wedding Live Gallery (v3)

Next.js 14 (App Router) · Tailwind 3 · Supabase (Auth anonymous, DB, Storage, Realtime)

## What's new in v3
- **Join form**: name, table number, **phone number** and **profile picture** are all required
  (phone is stored in a private table — only the host dashboard can see it)
- Every post / comment / like shows the guest's **profile picture** next to their name
- Tap the number beside the heart → **"Liked by"** list (picture, name, table) like Facebook
- **Voice Wishes** tab (separate from Photos & Videos): record in the browser (max 2 min) or pick an audio file,
  add an optional written wish, goes through host approval, and has **likes + comments** like photos
- Host dashboard: voice playback, **Guests** tab (name / table / phone) + CSV download
- Slideshow still shows photos & videos only

## Setup
1. `npm install`
2. `.env.local` (5 variables — see `.env.example`)
3. Supabase → SQL Editor:
   - fresh project: run `migration.sql`, `migration-v2.sql`, then `migration-v3.sql`
   - already on v2: run only `supabase/migration-v3.sql`
4. `npm run dev` → `/?table=5`, `/admin`, `/slideshow`

Note: microphone recording needs **HTTPS** (works on Vercel / localhost). Guests who joined before v3
are asked once to add their picture + phone.
