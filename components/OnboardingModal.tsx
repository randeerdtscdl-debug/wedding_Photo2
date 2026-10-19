'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useGuest } from './GuestProvider';
import Avatar from './Avatar';
import { prepareAvatar } from '@/lib/imageCompression';
import { normalizePhone } from '@/lib/phone';

type Stage = 'phone' | 'welcome' | 'form';
type Found = { guest_name: string; table_number: string; avatar_url: string | null };

export default function OnboardingModal() {
  const { profile, ready, register } = useGuest();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>('phone');
  const [name, setName] = useState('');
  const [table, setTable] = useState((params.get('table') ?? '').slice(0, 10));
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Guests who joined with an older version (no picture yet) are asked to complete their profile
  const needsProfile = ready && (!profile || !profile.avatar_url);
  const existingAvatar = found?.avatar_url ?? profile?.avatar_url ?? null;

  useEffect(() => {
    if (profile) { setName((n) => n || profile.guest_name); setTable((t) => t || profile.table_number); setStage('form'); }
  }, [profile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!needsProfile) return null;

  async function checkPhone(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return setErr('Please enter a valid phone number (e.g. 0771234567).');
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/guest/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: p }),
      });
      const json = await res.json();
      if (json.found) {
        setFound(json); setName(json.guest_name); setTable(json.table_number); setStage('welcome');
      } else setStage('form');
    } catch {
      setStage('form'); // lookup failed (offline?) → let them register normally
    } finally { setBusy(false); }
  }

  async function pickAvatar(f: File | undefined) {
    if (!f) return;
    setErr('');
    try {
      const blob = await prepareAvatar(f);
      setAvatar(blob);
      setPreview(URL.createObjectURL(blob));
    } catch { setErr('Could not read that picture. Please choose another one.'); }
  }

  async function finish(e?: React.FormEvent) {
    e?.preventDefault();
    const p = normalizePhone(phone);
    if (!p || !name.trim() || !table.trim()) return;
    if (!avatar && !existingAvatar) return setErr('Please add your profile picture.');
    setBusy(true); setErr('');
    try { await register({ name, table, phone: p, avatar, avatarUrl: existingAvatar }); }
    catch (e2) { console.error(e2); setErr('Could not join. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4">
      <div className="max-h-[96vh] w-full max-w-md animate-sheetUp overflow-y-auto rounded-t-3xl bg-ivory shadow-2xl sm:rounded-3xl">
        <div className="bg-ruby-gradient px-6 py-5 text-center">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-gold" aria-hidden />
          <h2 className="font-serif text-2xl text-ivory">Umini <span className="text-gold">&amp;</span> Randeera</h2>
          <p className="mt-1 font-display text-lg italic text-gold-light">Welcome to our wedding gallery</p>
        </div>

        <div className="safe-bottom px-6 pt-5">
          {/* STEP 1 — phone number (also finds returning guests) */}
          {stage === 'phone' && (
            <form onSubmit={checkPhone}>
              <label className="mb-1 block text-sm font-medium">Your phone number</label>
              <input className="field mb-1" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus
                placeholder="e.g. 0771234567" maxLength={18} inputMode="tel" autoComplete="tel" required />
              <p className="mb-3 text-xs text-cocoa/60">
                Joined before? Enter the same number and we&apos;ll bring you straight back in. Only the hosts can see your number.
              </p>
              {err && <p className="mb-3 text-sm text-ruby">{err}</p>}
              <button className="btn-ruby w-full" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Checking…</> : 'Continue'}</button>
            </form>
          )}

          {/* STEP 2a — returning guest */}
          {stage === 'welcome' && found && (
            <div className="text-center">
              <Avatar url={found.avatar_url} name={found.guest_name} size={96} className="mx-auto" />
              <p className="mt-3 font-display text-2xl italic text-ruby">Welcome back!</p>
              <p className="font-serif text-xl">{found.guest_name}</p>
              <p className="text-sm text-cocoa/60">Table {found.table_number}</p>
              {err && <p className="mt-3 text-sm text-ruby">{err}</p>}
              <button className="btn-ruby mt-4 w-full" disabled={busy} onClick={() => finish()}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : `Continue as ${found.guest_name.split(' ')[0]}`}
              </button>
              <button className="mt-3 text-xs text-cocoa/60 underline" onClick={() => setStage('form')}>Edit my details</button>
              <button className="mt-3 block w-full text-xs text-cocoa/60 underline" onClick={() => { setFound(null); setPhone(''); setStage('phone'); }}>This isn&apos;t me</button>
            </div>
          )}

          {/* STEP 2b — new guest (or editing) */}
          {stage === 'form' && (
            <form onSubmit={finish}>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
              <div className="mb-4 flex flex-col items-center">
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Choose profile picture"
                  className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-dashed border-gold bg-parchment-50 text-ruby">
                  {preview || existingAvatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview ?? existingAvatar!} alt="Your profile" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full flex-col items-center justify-center gap-1"><Camera className="h-7 w-7" /><span className="text-xs">Add photo</span></span>}
                </button>
                <p className="mt-2 text-xs text-cocoa/60">Profile picture <span className="text-ruby">*</span> — tap to {preview || existingAvatar ? 'change' : 'add'}</p>
              </div>

              <label className="mb-1 block text-sm font-medium">Your name</label>
              <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nimal Perera" maxLength={60} required />
              <label className="mb-1 block text-sm font-medium">Table number</label>
              <input className="field mb-3" value={table} onChange={(e) => setTable(e.target.value)}
                placeholder="e.g. 5" maxLength={10} inputMode="numeric" required />
              <label className="mb-1 block text-sm font-medium">Phone number</label>
              <input className="field mb-1" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0771234567" maxLength={18} inputMode="tel" autoComplete="tel" required />
              <p className="mb-3 text-xs text-cocoa/60">Only the hosts can see your phone number. Other guests see your name, table and picture.</p>
              {err && <p className="mb-3 text-sm text-ruby">{err}</p>}
              <button className="btn-ruby w-full" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Joining…</> : 'Join the gallery'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
