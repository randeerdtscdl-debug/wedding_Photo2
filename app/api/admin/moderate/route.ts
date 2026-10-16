import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
const BUCKET = 'wedding-photos';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action, id } = await req.json();
  const fail = (m: string, s = 500) => NextResponse.json({ error: m }, { status: s });

  if (action === 'approve_all') {
    const { error } = await supabaseAdmin.from('posts').update({ is_approved: true }).eq('is_approved', false);
    return error ? fail(error.message) : NextResponse.json({ ok: true });
  }
  if (typeof id !== 'string') return fail('Bad request', 400);

  switch (action) {
    case 'approve':
    case 'unapprove': {
      const { error } = await supabaseAdmin.from('posts').update({ is_approved: action === 'approve' }).eq('id', id);
      if (error) return fail(error.message);
      break;
    }
    case 'delete_post': { // also removes the file from storage
      const { data } = await supabaseAdmin.from('posts').select('storage_path').eq('id', id).maybeSingle();
      if (data?.storage_path) await supabaseAdmin.storage.from(BUCKET).remove([data.storage_path]);
      const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
      if (error) return fail(error.message);
      break;
    }
    case 'delete_comment': {
      const { error } = await supabaseAdmin.from('comments').delete().eq('id', id);
      if (error) return fail(error.message);
      break;
    }
    default:
      return fail('Unknown action', 400);
  }
  return NextResponse.json({ ok: true });
}
