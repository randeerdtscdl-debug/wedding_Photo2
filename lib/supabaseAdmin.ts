import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Server-only client using the service-role key (bypasses RLS). Never import in client code.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
