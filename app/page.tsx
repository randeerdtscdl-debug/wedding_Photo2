'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Film, ImageOff, Loader2, Mic, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FEED_SELECT, FeedPost, normalize } from '@/lib/feed';
import { useGuest } from '@/components/GuestProvider';
import { useLang } from '@/lib/i18n';
import Header from '@/components/Header';
import FilterBar, { Sort } from '@/components/FilterBar';
import PhotoCard from '@/components/PhotoCard';
import VoiceCard from '@/components/VoiceCard';
import VoiceModal from '@/components/VoiceModal';
import LikesModal from '@/components/LikesModal';
import PendingStrip from '@/components/PendingStrip';
import UploadModal from '@/components/UploadModal';
import CommentModal from '@/components/CommentModal';
import OnboardingModal from '@/components/OnboardingModal';

const PAGE_SIZE = 30;
type Tab = 'media' | 'voice';

function Feed() {
  const { profile } = useGuest();
  const { t } = useLang();
  const userId = useRef<string | null>(null);
  userId.current = profile?.id ?? null;

  const [posts, setPosts] = useState<FeedPost[]>([]);       // approved → visible to everyone
  const [pending, setPending] = useState<FeedPost[]>([]);   // this guest's own, awaiting approval
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<Sort>('latest');
  const [table, setTable] = useState('');
  const [tab, setTab] = useState<Tab>('media');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [likesPost, setLikesPost] = useState<FeedPost | null>(null);
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
          if (mine) showNotice(t('noticeApproved'));
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
  }, [addPost, bump, showNotice, t]);

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
    showNotice(p.media_type === 'audio' ? t('thanksVoice') : t('thanksMedia'));
  }, [showNotice, t]);

  const isVoice = (p: FeedPost) => p.media_type === 'audio';
  const tabPosts = useMemo(() => posts.filter((p) => (tab === 'voice') === isVoice(p)), [posts, tab]);
  const counts = useMemo(() => ({ voice: posts.filter(isVoice).length, media: posts.filter((p) => !isVoice(p)).length }), [posts]);

  const tables = useMemo(
    () => Array.from(new Set(tabPosts.map((p) => p.table_number))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [tabPosts]);

  const visible = useMemo(() => {
    const list = table ? tabPosts.filter((p) => p.table_number === table) : tabPosts;
    return sort === 'liked'
      ? [...list].sort((a, b) => b.like_count - a.like_count || +new Date(b.created_at) - +new Date(a.created_at))
      : list;
  }, [tabPosts, sort, table]);

  const tabCls = (on: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${on ? 'bg-ruby-gradient text-gold-light shadow' : 'text-cocoa/70 hover:bg-parchment-100'}`;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl pb-28">
        <div className="px-4 pt-3">
          <div className="flex rounded-full border border-gold/50 bg-white p-1">
            <button className={tabCls(tab === 'media')} onClick={() => { setTab('media'); setTable(''); }}>
              <Film className="h-4 w-4" />{t('tabMedia')} <span className="text-xs opacity-70">{counts.media}</span>
            </button>
            <button className={tabCls(tab === 'voice')} onClick={() => { setTab('voice'); setTable(''); }}>
              <Mic className="h-4 w-4" />{t('tabVoice')} <span className="text-xs opacity-70">{counts.voice}</span>
            </button>
          </div>
        </div>
        <FilterBar sort={sort} onSort={setSort} table={table} onTable={setTable} tables={tables} />
        <PendingStrip posts={pending} />
        <div className="px-4">
          {loading ? (
            <div className="flex justify-center py-24 text-ruby"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-cocoa/60">
              <ImageOff className="h-10 w-10 text-gold" />
              <p className="font-serif text-xl text-ruby">{t('nothing')}</p>
              <p className="font-display text-lg italic">{tab === 'voice' ? t('emptyVoice') : t('emptyMedia')}</p>
            </div>
          ) : (
            tab === 'voice' ? (
              <div className="mx-auto grid max-w-2xl gap-0">
                {visible.map((p) => (
                  <VoiceCard key={p.id} post={p} liked={myLikes.has(p.id)} onLike={toggleLike} onComment={setCommentPost} onShowLikes={setLikesPost} />
                ))}
              </div>
            ) : (
              <div className="columns-2 gap-3 md:columns-3 md:gap-4">
                {visible.map((p) => (
                  <PhotoCard key={p.id} post={p} liked={myLikes.has(p.id)} onLike={toggleLike} onComment={setCommentPost} onShowLikes={setLikesPost} />
                ))}
              </div>
            )
          )}
          {hasMore && !loading && (
            <div className="mt-4 flex justify-center">
              <button className="btn-outline" onClick={() => loadPage(posts.length)}>{t('loadMore')}</button>
            </div>
          )}
        </div>
      </main>

      {notice && (
        <div role="status" className="fixed inset-x-4 bottom-28 z-40 mx-auto flex max-w-sm animate-fadeIn items-center gap-2 rounded-2xl border border-gold bg-ruby-dark px-4 py-3 text-sm text-ivory shadow-xl">
          <Sparkles className="h-4 w-4 shrink-0 text-gold" />{notice}
        </div>
      )}

      <button onClick={() => (profile ? (tab === 'voice' ? setVoiceOpen(true) : setUploadOpen(true)) : null)}
        aria-label={tab === 'voice' ? t('fabVoice') : t('fabMedia')}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-ruby-gradient text-gold-light shadow-xl shadow-ruby/40 ring-2 ring-gold active:scale-95">
        {tab === 'voice' ? <Mic className="h-7 w-7" /> : <Camera className="h-7 w-7" />}
      </button>

      <OnboardingModal />
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />}
      {voiceOpen && <VoiceModal onClose={() => setVoiceOpen(false)} onUploaded={onUploaded} />}
      {likesPost && <LikesModal post={likesPost} onClose={() => setLikesPost(null)} />}
      {commentPost && <CommentModal post={commentPost} onClose={() => setCommentPost(null)} />}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Feed /></Suspense>;
}
