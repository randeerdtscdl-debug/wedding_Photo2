'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useGuest } from './GuestProvider';
import { prepareAvatar } from '@/lib/imageCompression';
import { cleanPhone } from '@/lib/feed';

export default function OnboardingModal() {
  const { profile, ready, register } = useGuest();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [table, setTable] = useState((params.get('table') ?? '').slice(0, 10));
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Guests who joined with an older version (no picture yet) are asked to complete their profile
  const needsProfile = ready && (!profile || !profile.avatar_url);
  const existingAvatar = profile?.avatar_url ?? null;

  useEffect(() => {
    if (profile) { setName((n) => n || profile.guest_name); setTable((t) => t || profile.table_number); }
  }, [profile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!needsProfile) return null;

  async function pickAvatar(f: File | undefined) {
    if (!f) return;
    setErr('');
    try {
      const blob = await prepareAvatar(f);
      setAvatar(blob);
      setPreview(URL.createObjectURL(blob));
    } catch { setErr('Could not read that picture. Please choose another one.'); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = cleanPhone(phone);
    if (!name.trim() || !table.trim()) return;
    if (!avatar && !existingAvatar) return setErr('Please add your profile picture.');
    if (!p) return setErr('Please enter a valid phone number (e.g. 0771234567).');
    setBusy(true); setErr('');
    try { await register({ name, table, phone: p, avatar }); }
    catch (e2) { console.error(e2); setErr('Could not join. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[96vh] w-full max-w-md animate-sheetUp overflow-y-auto rounded-t-3xl bg-ivory shadow-2xl sm:rounded-3xl">
        <div className="bg-ruby-gradient px-6 py-5 text-center">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-gold" aria-hidden />
          <h2 className="font-serif text-2xl text-ivory">Umini <span className="text-gold">&amp;</span> Randeera</h2>
          <p className="mt-1 font-display text-lg italic text-gold-light">Welcome to our wedding gallery</p>
        </div>
        <div className="safe-bottom px-6 pt-5">
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
        </div>
      </form>
    </div>
  );
}
