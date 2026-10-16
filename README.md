# Umini & Randeera — Wedding Live Gallery (v2)

Next.js 14 (App Router) · Tailwind 3 · Supabase (Auth anonymous, DB, Storage, Realtime)

## What's new in v2
- Guest uploads go to an **approval queue** — only host-approved items appear in the feed
- `/admin` → "Waiting" tab (Approve / Reject / Approve all) + "Approved" tab (undo, delete, comments, ZIP)
- `/slideshow` → full-screen auto-playing slideshow for the venue screen (opens in a new tab from the header button)
- **Videos** (up to 50 MB) alongside photos
- Restyled with the invitation's ruby / gold / ivory theme and fonts

## Setup
1. `npm install`
2. `.env.local` (same 5 variables as before — see `.env.example`)
3. Supabase → SQL Editor:
   - fresh project: run `supabase/migration.sql`, then `supabase/migration-v2.sql`
   - already ran v1: run only `supabase/migration-v2.sql`
4. `npm run dev` → `/?table=5`, `/admin`, `/slideshow`
