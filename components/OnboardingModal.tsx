'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useGuest } from './GuestProvider';
import Avatar from './Avatar';
import { prepareAvatar } from '@/lib/imageCompression';
import { normalizePhone } from '@/lib/phone';
import { useLang } from '@/lib/i18n';
import LangToggle from './LangToggle';

type Found = { guest_name: string; table_number: string; avatar_url: string | null };

async function lookup(phone: string): Promise<Found | null> {
  try {
    const res = await fetch('/api/guest/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    return json.found ? json : null;
  } catch { return null; }
}

export default function OnboardingModal() {
  const { profile, ready, register } = useGuest();
  const { t: tr } = useLang();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [table, setTable] = useState((params.get('table') ?? '').slice(0, 10));
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [suggest, setSuggest] = useState<Found | null>(null);   // "is this you?" popup
  const checked = useRef('');                                    // last phone we looked up / dismissed
  const fileRef = useRef<HTMLInputElement>(null);

  // Guests who joined with an older version (no picture yet) are asked to complete their profile
  const needsProfile = ready && (!profile || !profile.avatar_url);
  const existingAvatar = profile?.avatar_url ?? null;

  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.guest_name); setTable((t) => t || profile.table_number);
      checked.current = 'skip'; // already logged in → no "is this you?" check
    }
  }, [profile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!needsProfile) return null;

  /** Looks the number up once per value; opens the popup if it belongs to a registered guest. */
  async function checkExisting(): Promise<boolean> {
    const p = normalizePhone(phone);
    if (!p || checked.current === p || checked.current === 'skip') return false;
    checked.current = p;
    const found = await lookup(p);
    if (found) { setSuggest(found); return true; }
    return false;
  }

  async function pickAvatar(f: File | undefined) {
    if (!f) return;
    setErr('');
    try {
      const blob = await prepareAvatar(f);
      setAvatar(blob);
      setPreview(URL.createObjectURL(blob));
    } catch { setErr(tr('errPicRead')); }
  }

  async function join(opts?: { found?: Found }) {
    const p = normalizePhone(phone);
    const f = opts?.found;
    const n = f?.guest_name ?? name, t = f?.table_number ?? table;
    const av = f ? f.avatar_url : existingAvatar;
    if (!p) return setErr(tr('errPhone'));
    if (!n.trim() || !t.trim()) return;
    if (!f && !avatar && !av) return setErr(tr('errAvatar'));
    setBusy(true); setErr('');
    try {
      await register({ name: n, table: t, phone: p, avatar: f ? null : avatar, avatarUrl: av, claim: !!f });
    } catch (e2) { console.error(e2); setErr(tr('errJoin')); }
    finally { setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizePhone(phone)) return setErr(tr('errPhone'));
    setBusy(true);
    const popup = await checkExisting();   // safety net if they never left the phone field
    setBusy(false);
    if (!popup) join();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[96vh] w-full max-w-md animate-sheetUp overflow-y-auto rounded-t-3xl bg-ivory shadow-2xl sm:rounded-3xl">
        <div className="relative bg-ruby-gradient px-6 py-5 text-center">
          <LangToggle className="absolute right-3 top-3" />
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-gold" aria-hidden />
          <h2 className="font-serif text-2xl text-ivory">Umini <span className="text-gold">&amp;</span> Randeera</h2>
          <p className="mt-1 font-display text-lg italic text-gold-light">{tr('welcomeGallery')}</p>
        </div>
        <div className="safe-bottom px-6 pt-5">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
          <div className="mb-4 flex flex-col items-center">
            <button type="button" onClick={() => fileRef.current?.click()} aria-label={tr('profilePic')}
              className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-dashed border-gold bg-parchment-50 text-ruby">
              {preview || existingAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={preview ?? existingAvatar!} alt="Your profile" className="h-full w-full object-cover" />
                : <span className="flex h-full w-full flex-col items-center justify-center gap-1"><Camera className="h-7 w-7" /><span className="text-xs">{tr('addPhoto')}</span></span>}
            </button>
            <p className="mt-2 text-xs text-cocoa/60">{tr('profilePic')} <span className="text-ruby">*</span> — {preview || existingAvatar ? tr('tapChange') : tr('tapAdd')}</p>
          </div>

          <label className="mb-1 block text-sm font-medium">{tr('yourName')}</label>
          <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={tr('namePh')} maxLength={60} required />
          <label className="mb-1 block text-sm font-medium">{tr('tableNumber')}</label>
          <input className="field mb-3" value={table} onChange={(e) => setTable(e.target.value)}
            placeholder={tr('tablePh')} maxLength={10} inputMode="numeric" required />
          <label className="mb-1 block text-sm font-medium">{tr('phoneNumber')}</label>
          <input className="field mb-1" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => checkExisting()}
            placeholder={tr('phonePh')} maxLength={18} inputMode="tel" autoComplete="tel" required />
          <p className="mb-3 text-xs text-cocoa/60">{tr('phonePrivacy')}</p>
          {err && <p className="mb-3 text-sm text-ruby">{err}</p>}
          <button className="btn-ruby w-full" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />{tr('pleaseWait')}</> : tr('join')}</button>
        </div>
      </form>

      {/* "Is this you?" popup — shown when the phone number is already registered */}
      {suggest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-cocoa/70 p-5 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-ivory p-6 text-center shadow-2xl">
            <Avatar url={suggest.avatar_url} name={suggest.guest_name} size={88} className="mx-auto" />
            <p className="mt-3 font-display text-xl italic text-ruby">{tr('alreadyJoined')}</p>
            <p className="mt-1 text-sm text-cocoa/70">{tr('registeredAs')}</p>
            <p className="font-serif text-xl">{suggest.guest_name}</p>
            <p className="text-sm text-cocoa/60">{tr('tableN', { n: suggest.table_number })}</p>
            <p className="mt-3 text-sm">{tr('isThisYou')}</p>
            <button type="button" className="btn-ruby mt-3 w-full" disabled={busy}
              onClick={() => { const f = suggest; setSuggest(null); join({ found: f }); }}>
              {tr('yesContinue', { name: suggest.guest_name.split(' ')[0] })}
            </button>
            <button type="button" className="mt-3 text-sm text-cocoa/60 underline" onClick={() => setSuggest(null)}>
              {tr('noSomeoneElse')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
