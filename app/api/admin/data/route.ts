import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id,image_url,storage_path,caption,table_number,media_type,is_approved,created_at,profiles(guest_name),comments(id,comment_text,created_at,profiles(guest_name))')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}
