'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImageOff, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FEED_SELECT, FeedPost, normalize } from '@/lib/feed';
import { useGuest } from '@/components/GuestProvider';
import Header from '@/components/Header';
import FilterBar, { Sort } from '@/components/FilterBar';
import PhotoCard from '@/components/PhotoCard';
import PendingStrip from '@/components/PendingStrip';
import UploadModal from '@/components/UploadModal';
import CommentModal from '@/components/CommentModal';
import OnboardingModal from '@/components/OnboardingModal';

const PAGE_SIZE = 30;

function Feed() {
  const { profile } = useGuest();
  const userId = useRef<string | null>(null);
  userId.current = profile?.id ?? null;

  const [posts, setPosts] = useState<FeedPost[]>([]);       // approved → visible to everyone
  const [pending, setPending] = useState<FeedPost[]>([]);   // this guest's own, awaiting approval
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<Sort>('latest');
  const [table, setTable] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 6000);
  }, []);

  const bump = useCallback((id: string, key: 'like_count' | 'comment_count', d: number) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: Math.max(0, p[key] + d) } : p))), []);

  const addPost = useCallback((p: FeedPost) =>
    setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev])), []);

  const loadPage = useCallback(async (offset: number) => {
    const { data } = await supabase.from('posts').select(FEED_SELECT).eq('is_approved', true)
      .order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    const rows = (data ?? []).map(normalize);
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => { loadPage(0); }, [loadPage]);

  // This guest's likes + their own pending uploads
  useEffect(() => {
    if (!profile) return;
    supabase.from('likes').select('post_id').eq('user_id', profile.id)
      .then(({ data }) => setMyLikes(new Set((data ?? []).map((l) => l.post_id))));
    supabase.from('posts').select(FEED_SELECT).eq('user_id', profile.id).eq('is_approved', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPending((data ?? []).map(normalize)));
  }, [profile]);

  // Realtime
  useEffect(() => {
    const fetchOne = async (id: string) => {
      const { data } = await supabase.from('posts').select(FEED_SELECT).eq('id', id).maybeSingle();
      return data ? normalize(data) : null;
    };
    const ch = supabase.channel('feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (p) => {
        if (!p.new.is_approved) return; // pending uploads never enter the public feed
        const post = await fetchOne(p.new.id);
        if (post) addPost(post);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (p) => {
        const id = p.new.id as string;
        const mine = p.new.user_id === userId.current;
        if (p.new.is_approved) {            // host approved it → goes live
          const post = await fetchOne(id);
          if (!post) return;
          addPost(post);
          setPending((prev) => prev.filter((x) => x.id !== id));
          if (mine) showNotice('Your upload was approved and is now in the gallery.');
        } else {                              // host moved it back to pending
          setPosts((prev) => prev.filter((x) => x.id !== id));
          if (mine) { const post = await fetchOne(id); if (post) setPending((prev) => (prev.some((x) => x.id === id) ? prev : [post, ...prev])); }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (p) => {
        setPosts((prev) => prev.filter((x) => x.id !== p.old.id));
        setPending((prev) => prev.filter((x) => x.id !== p.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, (p) => {
        if (p.new.user_id !== userId.current) bump(p.new.post_id, 'like_count', 1); // own likes are optimistic
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, (p) => {
        if (p.old.user_id && p.old.user_id !== userId.current) bump(p.old.post_id, 'like_count', -1);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (p) => bump(p.new.post_id, 'comment_count', 1))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (p) => {
        if (p.old.post_id) bump(p.old.post_id, 'comment_count', -1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [addPost, bump, showNotice]);

  async function toggleLike(post: FeedPost) {
    if (!profile) return;
    const liked = myLikes.has(post.id);
    setMyLikes((s) => { const n = new Set(s); liked ? n.delete(post.id) : n.add(post.id); return n; });
    bump(post.id, 'like_count', liked ? -1 : 1);
    const { error } = liked
      ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', profile.id)
      : await supabase.from('likes').insert({ post_id: post.id, user_id: profile.id });
    if (error && error.code !== '23505') {
      setMyLikes((s) => { const n = new Set(s); liked ? n.add(post.id) : n.delete(post.id); return n; });
      bump(post.id, 'like_count', liked ? 1 : -1);
    }
  }

  const onUploaded = useCallback((p: FeedPost) => {
    setPending((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
    showNotice('Thank you! Your upload is waiting for the hosts to approve it.');
  }, [showNotice]);

  const tables = useMemo(
    () => Array.from(new Set(posts.map((p) => p.table_number))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [posts]);

  const visible = useMemo(() => {
    const list = table ? posts.filter((p) => p.table_number === table) : posts;
    return sort === 'liked'
      ? [...list].sort((a, b) => b.like_count - a.like_count || +new Date(b.created_at) - +new Date(a.created_at))
      : list;
  }, [posts, sort, table]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl pb-28">
        <FilterBar sort={sort} onSort={setSort} table={table} onTable={setTable} tables={tables} />
        <PendingStrip posts={pending} />
        <div className="px-4">
          {loading ? (
            <div className="flex justify-center py-24 text-ruby"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-cocoa/60">
              <ImageOff className="h-10 w-10 text-gold" />
              <p className="font-serif text-xl text-ruby">Nothing here yet</p>
              <p className="font-display text-lg italic">Be the first to share a moment.</p>
            </div>
          ) : (
            <div className="columns-2 gap-3 md:columns-3 md:gap-4">
              {visible.map((p) => (
                <PhotoCard key={p.id} post={p} liked={myLikes.has(p.id)} onLike={toggleLike} onComment={setCommentPost} />
              ))}
            </div>
          )}
          {hasMore && !loading && (
            <div className="mt-4 flex justify-center">
              <button className="btn-outline" onClick={() => loadPage(posts.length)}>Load more</button>
            </div>
          )}
        </div>
      </main>

      {notice && (
        <div role="status" className="fixed inset-x-4 bottom-28 z-40 mx-auto flex max-w-sm animate-fadeIn items-center gap-2 rounded-2xl border border-gold bg-ruby-dark px-4 py-3 text-sm text-ivory shadow-xl">
          <Sparkles className="h-4 w-4 shrink-0 text-gold" />{notice}
        </div>
      )}

      <button onClick={() => (profile ? setUploadOpen(true) : null)} aria-label="Upload photo or video"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-ruby-gradient text-gold-light shadow-xl shadow-ruby/40 ring-2 ring-gold active:scale-95">
        <Camera className="h-7 w-7" />
      </button>

      <OnboardingModal />
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />}
      {commentPost && <CommentModal post={commentPost} onClose={() => setCommentPost(null)} />}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Feed /></Suspense>;
}
