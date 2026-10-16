'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Download, Loader2, LogOut, Lock, MessageCircle, Presentation, Trash2, Undo2, X } from 'lucide-react';

type AdminComment = { id: string; comment_text: string; created_at: string; profiles: { guest_name: string } | null };
type AdminPost = {
  id: string; image_url: string; storage_path: string; caption: string | null; table_number: string;
  media_type: 'image' | 'video'; is_approved: boolean; created_at: string;
  profiles: { guest_name: string } | null; comments: AdminComment[];
};

function Media({ p, className }: { p: AdminPost; className: string }) {
  return p.media_type === 'video'
    ? <video src={`${p.image_url}#t=0.1`} controls playsInline preload="metadata" className={`${className} bg-ruby-dark`} />
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={p.image_url} alt="" loading="lazy" className={className} />;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');
  const [open, setOpen] = useState<string | null>(null);
  const [zipMsg, setZipMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/data', { cache: 'no-store' });
    if (res.status === 401) return setAuthed(false);
    const json = await res.json();
    setPosts(json.posts ?? []);
    setAuthed(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  // New uploads show up without refreshing (poll every 8s while the tab is visible)
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => clearInterval(t);
  }, [authed, load]);

  const pending = useMemo(() => posts.filter((p) => !p.is_approved), [posts]);
  const approved = useMemo(() => posts.filter((p) => p.is_approved), [posts]);
  useEffect(() => { document.title = pending.length ? `(${pending.length}) Admin • Gallery` : 'Admin • Gallery'; }, [pending.length]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) return setLoginErr('Incorrect password');
    setPassword(''); load();
  }

  async function act(action: string, id?: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    // optimistic update so moderating feels instant
    if (action === 'approve' || action === 'unapprove') setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, is_approved: action === 'approve' } : p)));
    if (action === 'delete_post') setPosts((ps) => ps.filter((p) => p.id !== id));
    await fetch('/api/admin/moderate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id }) });
    load();
  }

  async function downloadZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (let i = 0; i < approved.length; i++) {
      setZipMsg(`Packing ${i + 1} / ${approved.length}…`);
      try {
        const p = approved[i];
        const blob = await (await fetch(p.image_url)).blob();
        const who = (p.profiles?.guest_name ?? 'guest').replace(/[^\w-]+/g, '_');
        const ext = p.storage_path.split('.').pop() || (p.media_type === 'video' ? 'mp4' : 'jpg');
        zip.file(`table-${p.table_number}_${who}_${p.id.slice(0, 6)}.${ext}`, blob);
      } catch { /* skip a failed file */ }
    }
    setZipMsg('Building ZIP…');
    const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out); a.download = 'wedding-gallery.zip'; a.click();
    URL.revokeObjectURL(a.href); setZipMsg('');
  }

  if (authed === null) return <div className="flex min-h-screen items-center justify-center text-ruby"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!authed) return (
    <main className="flex min-h-screen items-center justify-center bg-ruby-gradient p-6">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-gold/60 bg-ivory p-7 shadow-2xl">
        <Lock className="mx-auto mb-2 h-6 w-6 text-ruby" />
        <h1 className="mb-1 text-center font-serif text-2xl text-ruby">Host dashboard</h1>
        <p className="mb-5 text-center font-display text-lg italic text-cocoa/60">Umini &amp; Randeera</p>
        <input type="password" className="field mb-3" placeholder="Admin password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {loginErr && <p className="mb-3 text-sm text-ruby">{loginErr}</p>}
        <button className="btn-ruby w-full">Sign in</button>
      </form>
    </main>
  );

  const tabCls = (on: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-medium transition ${on ? 'bg-ruby-gradient text-gold-light shadow' : 'text-cocoa/70 hover:bg-parchment-100'}`;

  return (
    <main className="min-h-screen">
      <header className="bg-ruby-gradient">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="font-serif text-2xl text-ivory">Host dashboard</h1>
            <p className="font-display text-lg italic text-gold-light">Review what guests share</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/slideshow" target="_blank" rel="noopener" className="btn-gold !py-2.5 text-sm"><Presentation className="h-4 w-4" />Slideshow</a>
            <button className="btn-gold !py-2.5 text-sm" onClick={downloadZip} disabled={!!zipMsg || !approved.length}>
              {zipMsg ? <><Loader2 className="h-4 w-4 animate-spin" />{zipMsg}</> : <><Download className="h-4 w-4" />Download approved (ZIP)</>}
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 text-ivory" aria-label="Sign out"
              onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthed(false); }}><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="gold-rule" />
      </header>

      <div className="mx-auto max-w-6xl p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-gold/50 bg-white p-1">
            <button className={tabCls(tab === 'pending')} onClick={() => setTab('pending')}>Waiting ({pending.length})</button>
            <button className={tabCls(tab === 'approved')} onClick={() => setTab('approved')}>Approved ({approved.length})</button>
          </div>
          {tab === 'pending' && pending.length > 1 && (
            <button className="btn-outline !py-2" onClick={() => act('approve_all', undefined, `Approve all ${pending.length} waiting uploads?`)}>
              <CheckCheck className="h-4 w-4" />Approve all
            </button>
          )}
        </div>

        {tab === 'pending' ? (
          pending.length === 0 ? (
            <p className="py-20 text-center font-display text-2xl italic text-cocoa/50">Nothing waiting. New uploads appear here automatically.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-cocoa/60">Rejecting deletes the file permanently.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((p) => (
                  <div key={p.id} className="card-shadow overflow-hidden rounded-2xl border border-gold/40 bg-white">
                    <Media p={p} className="aspect-[4/5] w-full object-cover" />
                    <div className="p-3">
                      <p className="text-sm font-medium">{p.profiles?.guest_name ?? 'Guest'} <span className="text-ruby">· Table {p.table_number}</span></p>
                      {p.caption && <p className="mt-1 font-display text-lg italic leading-snug">{p.caption}</p>}
                      <div className="mt-3 flex gap-2">
                        <button className="btn-ruby flex-1 !py-2.5" onClick={() => act('approve', p.id)}><Check className="h-4 w-4" />Approve</button>
                        <button className="btn-outline flex-1 !py-2.5" onClick={() => act('delete_post', p.id)}><X className="h-4 w-4" />Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : approved.length === 0 ? (
          <p className="py-20 text-center font-display text-2xl italic text-cocoa/50">No approved items yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {approved.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border border-gold/30 bg-white">
                <Media p={p} className="aspect-square w-full object-cover" />
                <div className="p-2.5 text-xs">
                  <p className="font-medium">{p.profiles?.guest_name ?? 'Guest'} · T{p.table_number}</p>
                  {p.caption && <p className="mt-1 line-clamp-2 text-cocoa/70">{p.caption}</p>}
                  <div className="mt-2 flex items-center gap-1.5">
                    <button className="rounded-full bg-parchment-100 p-2" title="Move back to waiting" onClick={() => act('unapprove', p.id)}><Undo2 className="h-4 w-4" /></button>
                    <button className="rounded-full bg-ruby/10 p-2 text-ruby" title="Delete" onClick={() => act('delete_post', p.id, 'Permanently delete this?')}><Trash2 className="h-4 w-4" /></button>
                    <button className="ml-auto flex items-center gap-1 rounded-full bg-parchment-100 px-2.5 py-2" onClick={() => setOpen(open === p.id ? null : p.id)}>
                      <MessageCircle className="h-4 w-4" />{p.comments.length}
                    </button>
                  </div>
                  {open === p.id && (
                    <ul className="mt-2 space-y-1.5 border-t border-gold/30 pt-2">
                      {p.comments.length === 0 && <li className="text-cocoa/50">No comments</li>}
                      {p.comments.map((c) => (
                        <li key={c.id} className="flex items-start justify-between gap-2">
                          <span><b>{c.profiles?.guest_name ?? 'Guest'}:</b> {c.comment_text}</span>
                          <button onClick={() => act('delete_comment', c.id, 'Delete this comment?')} aria-label="Delete comment"><X className="h-3.5 w-3.5 text-ruby" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
