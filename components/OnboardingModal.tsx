'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useGuest } from './GuestProvider';

export default function OnboardingModal() {
  const { profile, ready, register } = useGuest();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [table, setTable] = useState((params.get('table') ?? '').slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!ready || profile) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !table.trim()) return;
    setBusy(true); setErr('');
    try { await register(name, table); }
    catch { setErr('Could not join. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4">
      <form onSubmit={submit} className="w-full max-w-md animate-sheetUp overflow-hidden rounded-t-3xl bg-ivory shadow-2xl sm:rounded-3xl">
        <div className="bg-ruby-gradient px-6 py-6 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-gold" aria-hidden />
          <h2 className="font-serif text-2xl text-ivory">Umini <span className="text-gold">&amp;</span> Randeera</h2>
          <p className="mt-1 font-display text-lg italic text-gold-light">Welcome to our wedding gallery</p>
        </div>
        <div className="safe-bottom px-6 pt-5">
          <label className="mb-1 block text-sm font-medium">Your name</label>
          <input className="field mb-4" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nimal Perera" maxLength={60} autoFocus required />
          <label className="mb-1 block text-sm font-medium">Table number</label>
          <input className="field mb-3" value={table} onChange={(e) => setTable(e.target.value)}
            placeholder="e.g. 5" maxLength={10} inputMode="numeric" required />
          <p className="mb-4 text-xs text-cocoa/60">Photos and videos appear in the gallery once the hosts approve them.</p>
          {err && <p className="mb-3 text-sm text-ruby">{err}</p>}
          <button className="btn-ruby w-full" disabled={busy}>{busy ? 'Joining…' : 'Join the gallery'}</button>
        </div>
      </form>
    </div>
  );
}
