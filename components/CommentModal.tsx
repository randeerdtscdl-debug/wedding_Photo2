'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FeedPost, timeAgo } from '@/lib/feed';
import { useGuest } from './GuestProvider';

type Comment = { id: string; comment_text: string; created_at: string; guest_name: string; table_number: string };
const SELECT = 'id,comment_text,created_at,profiles(guest_name,table_number)';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toComment = (r: any): Comment => ({
  id: r.id, comment_text: r.comment_text, created_at: r.created_at,
  guest_name: r.profiles?.guest_name ?? 'Guest', table_number: r.profiles?.table_number ?? '',
});

export default function CommentModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const { profile } = useGuest();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const add = (c: Comment) => setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));

  useEffect(() => {
    let alive = true;
    supabase.from('comments').select(SELECT).eq('post_id', post.id).order('created_at')
      .then(({ data }) => alive && setComments((data ?? []).map(toComment)));

    const ch = supabase.channel(`comments:${post.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        async (p) => {
          const { data } = await supabase.from('comments').select(SELECT).eq('id', p.new.id).single();
          if (data && alive) add(toComment(data));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        (p) => setComments((prev) => prev.filter((c) => c.id !== p.old.id)))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [post.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !profile || busy) return;
    setBusy(true);
    const { data, error } = await supabase.from('comments')
      .insert({ post_id: post.id, user_id: profile.id, comment_text: t }).select(SELECT).single();
    setBusy(false);
    if (!error && data) { add(toComment(data)); setText(''); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] w-full max-w-md animate-sheetUp flex-col overflow-hidden rounded-t-3xl bg-ivory shadow-2xl sm:h-[70vh] sm:rounded-3xl">
        <div className="flex items-center justify-between bg-ruby-gradient px-5 py-4 text-ivory">
          <h2 className="font-serif text-lg">Comments</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {comments.length === 0 && <p className="pt-10 text-center font-display text-lg italic text-cocoa/50">Be the first to leave a kind word</p>}
          {comments.map((c) => (
            <div key={c.id}>
              <p className="text-xs">
                <span className="font-semibold">{c.guest_name}</span>
                {c.table_number && <span className="ml-1 text-ruby">· T{c.table_number}</span>}
                <span className="ml-2 text-cocoa/40">{timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-0.5 break-words text-sm">{c.comment_text}</p>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="safe-bottom flex gap-2 border-t border-gold/30 px-4 pt-3">
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Write a comment…" />
          <button className="btn-ruby !px-4" disabled={!text.trim() || busy} aria-label="Send"><Send className="h-5 w-5" /></button>
        </form>
      </div>
    </div>
  );
}
