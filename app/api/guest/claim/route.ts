import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { phoneVariants } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/**
 * Re-links a returning guest to their old identity. The browser's session was lost (cache cleared / new phone),
 * so Supabase made a NEW anonymous user. We move the old profile, posts, comments and likes onto the new user id,
 * so the guest keeps everything and no duplicate guest is created.
 */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  const newId = u?.user?.id;
  if (!newId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phone } = await req.json().catch(() => ({}));
  const variants = phoneVariants(String(phone ?? ''));
  if (!variants.length) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const { data: contacts } = await supabaseAdmin
    .from('guest_contacts').select('id,phone').in('phone', variants).order('created_at', { ascending: false });
  if (!contacts?.length || contacts.some((c) => c.id === newId)) return NextResponse.json({ claimed: false });

  const old = contacts[0];
  const { data: oldProfile } = await supabaseAdmin
    .from('profiles').select('guest_name,table_number,avatar_url').eq('id', old.id).maybeSingle();
  if (!oldProfile) return NextResponse.json({ claimed: false });

  // 1) profile + contact for the new user id
  const { error: pErr } = await supabaseAdmin.from('profiles').upsert({ id: newId, ...oldProfile });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  await supabaseAdmin.from('guest_contacts').delete().eq('id', old.id);
  await supabaseAdmin.from('guest_contacts').upsert({ id: newId, phone: old.phone });

  // 2) move everything the guest created
  for (const table of ['posts', 'comments', 'likes'] as const) {
    const { error } = await supabaseAdmin.from(table).update({ user_id: newId }).eq('user_id', old.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3) remove the orphaned old identity (best effort)
  await supabaseAdmin.auth.admin.deleteUser(old.id).catch(() => {});
  return NextResponse.json({ claimed: true, ...oldProfile });
}
