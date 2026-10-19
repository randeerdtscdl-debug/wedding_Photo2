'use client';
import { useEffect, useState } from 'react';
import { Heart, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FeedPost, timeAgo } from '@/lib/feed';
import Avatar from './Avatar';

type Liker = { id: string; created_at: string; guest_name: string; table_number: string; avatar_url: string | null };

/** "Who liked this" list, like Facebook's reactions list. */
export default function LikesModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [list, setList] = useState<Liker[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1) who liked
      const { data: likes, error: e1 } = await supabase.from('likes')
        .select('id,user_id,created_at').eq('post_id', post.id).order('created_at', { ascending: false });
      if (!alive) return;
      if (e1) { console.error(e1); return setError('Could not load the list. Please try again.'); }
      const ids = Array.from(new Set((likes ?? []).map((l) => l.user_id)));
      if (!ids.length) return setList([]);

      // 2) their profiles (falls back if the v3 migration has not been run yet)
      let res = await supabase.from('profiles').select('id,guest_name,table_number,avatar_url').in('id', ids);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[] | null = res.data;
      if (res.error) {
        const r2 = await supabase.from('profiles').select('id,guest_name,table_number').in('id', ids);
        rows = r2.data;
        if (r2.error) { console.error(r2.error); return alive ? setError('Could not load the list. Please try again.') : undefined; }
      }
      if (!alive) return;
      const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
      setList((likes ?? []).map((l) => {
        const pr = byId.get(l.user_id);
        return {
          id: l.id, created_at: l.created_at,
          guest_name: pr?.guest_name ?? 'Guest', table_number: pr?.table_number ?? '',
          avatar_url: pr?.avatar_url ?? null,
        };
      }));
    })();
    return () => { alive = false; };
  }, [post.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-md animate-sheetUp flex-col overflow-hidden rounded-t-3xl bg-ivory shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between bg-ruby-gradient px-5 py-4 text-ivory">
          <h2 className="flex items-center gap-2 font-serif text-lg"><Heart className="h-4 w-4 fill-gold text-gold" />Liked by {post.like_count}</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <ul className="safe-bottom flex-1 divide-y divide-gold/20 overflow-y-auto px-5 py-2">
          {error && <li className="py-10 text-center text-sm text-ruby">{error}</li>}
          {list === null && !error && <li className="flex justify-center py-10 text-ruby"><Loader2 className="h-6 w-6 animate-spin" /></li>}
          {list?.length === 0 && <li className="py-10 text-center font-display text-lg italic text-cocoa/50">No likes yet</li>}
          {list?.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5">
              <Avatar url={l.avatar_url} name={l.guest_name} size={40} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">{l.guest_name}</p>
                <p className="text-xs text-ruby">{l.table_number && `Table ${l.table_number}`}</p>
              </div>
              <span className="text-xs text-cocoa/40">{timeAgo(l.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
