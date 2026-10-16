'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Profile = { id: string; guest_name: string; table_number: string };
type Ctx = {
  profile: Profile | null;
  ready: boolean;
  register: (name: string, table: string) => Promise<void>;
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
          .from('profiles').select('id,guest_name,table_number')
          .eq('id', session.user.id).maybeSingle();
        if (!cancelled && data) setProfile(data);
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const register = useCallback(async (name: string, table: string) => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) throw error ?? new Error('Sign-in failed');
      session = data.session;
    }
    const row = { id: session.user.id, guest_name: name.trim(), table_number: table.trim() };
    const { error } = await supabase.from('profiles').upsert(row);
    if (error) throw error;
    setProfile(row);
  }, []);

  const value = useMemo(() => ({ profile, ready, register }), [profile, ready, register]);
  return <GuestCtx.Provider value={value}>{children}</GuestCtx.Provider>;
}
