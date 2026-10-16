import { createClient } from '@supabase/supabase-js';

// Browser client. Session (anonymous user) is persisted in localStorage automatically,
// so guests keep their identity if they refresh or reopen the page.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  }
);

export const BUCKET = 'wedding-photos';
