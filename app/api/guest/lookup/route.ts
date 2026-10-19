import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { phoneVariants } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/** "Is this phone number already registered?" → returns the guest's public details to pre-fill the form. */
export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}));
  const variants = phoneVariants(String(phone ?? ''));
  if (!variants.length) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const { data: contacts } = await supabaseAdmin
    .from('guest_contacts').select('id').in('phone', variants).order('created_at', { ascending: false }).limit(1);
  const id = contacts?.[0]?.id;
  if (!id) return NextResponse.json({ found: false });

  const { data: p } = await supabaseAdmin
    .from('profiles').select('guest_name,table_number,avatar_url').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, ...p });
}
