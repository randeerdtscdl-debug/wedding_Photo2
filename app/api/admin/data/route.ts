import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [postsRes, guestsRes, contactsRes] = await Promise.all([
    supabaseAdmin
      .from('posts')
      .select('id,user_id,image_url,storage_path,caption,table_number,media_type,duration_sec,is_approved,created_at,profiles(guest_name,avatar_url),comments(id,comment_text,created_at,profiles(guest_name))')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id,guest_name,table_number,avatar_url,created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('guest_contacts').select('id,phone'),
  ]);
  if (postsRes.error) return NextResponse.json({ error: postsRes.error.message }, { status: 500 });

  // phone numbers live in a private table → only the host dashboard (service role) can read them
  const phones = new Map((contactsRes.data ?? []).map((c) => [c.id, c.phone]));
  const guests = (guestsRes.data ?? []).map((g) => ({ ...g, phone: phones.get(g.id) ?? null }));
  return NextResponse.json({ posts: postsRes.data, guests });
}
