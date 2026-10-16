'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, BUCKET } from '@/lib/supabaseClient';

export type Profile = { id: string; guest_name: string; table_number: string; avatar_url: string | null };
export type RegisterInput = { name: string; table: string; phone: string; avatar: Blob | null };
type Ctx = {
  profile: Profile | null;
  ready: boolean;
  register: (input: RegisterInput) => Promise<void>;
};

const GuestCtx = createContext<Ctx>({ profile: null, ready: false, register: async () => {} });
export const useGuest = () => useContext(GuestCtx);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  // Restore an existing anonymous session + profile (no network sign-in until onboarding)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles').select('id,guest_name,table_number,avatar_url')
          .eq('id', session.user.id).maybeSingle();
        if (!cancelled && data) setProfile(data);
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const register = useCallback(async ({ name, table, phone, avatar }: RegisterInput) => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) throw error ?? new Error('Sign-in failed');
      session = data.session;
    }
    const uid = session.user.id;

    // keep the old picture if the guest is only completing missing details
    let avatar_url: string | null = profile?.avatar_url ?? null;
    if (avatar) {
      const path = `${uid}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, avatar, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (upErr) throw upErr;
      avatar_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const row: Profile = { id: uid, guest_name: name.trim(), table_number: table.trim(), avatar_url };
    const { error } = await supabase.from('profiles').upsert(row);
    if (error) throw error;
    // phone is stored in a separate PRIVATE table (only the host dashboard can read it)
    const { error: cErr } = await supabase.from('guest_contacts').upsert({ id: uid, phone });
    if (cErr) throw cErr;
    setProfile(row);
  }, [profile]);

  const value = useMemo(() => ({ profile, ready, register }), [profile, ready, register]);
  return <GuestCtx.Provider value={value}>{children}</GuestCtx.Provider>;
}
