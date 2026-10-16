'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FEED_SELECT, FeedPost, normalize } from '@/lib/feed';

const IMAGE_MS = 7000; // keep in sync with the `bar` animation in tailwind.config.ts
const VIDEO_MAX_MS = 90000;

function shuffle<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function Slide({ item, active, paused, muted, onEnded }: { item: FeedPost; active: boolean; paused: boolean; muted: boolean; onEnded: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (v.current) v.current.muted = muted; }, [muted]);
  useEffect(() => { if (!active && v.current) { v.current.pause(); v.current.currentTime = 0; } }, [active]);
  useEffect(() => {
    if (!v.current || !active) return;
    if (paused) v.current.pause(); else v.current.play().catch(() => {});
  }, [active, paused]);

  if (item.media_type === 'video') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ruby-dark">
        <video ref={v} src={item.image_url} muted playsInline preload="auto" onEnded={onEnded} className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-ruby-dark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image_url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image_url} alt={item.caption ?? ''} className="relative h-full w-full object-contain" />
    </div>
  );
}

export default function SlideshowPage() {
  const queue = useRef<FeedPost[]>([]);
  const pos = useRef(-1);
  const [slots, setSlots] = useState<[FeedPost | null, FeedPost | null]>([null, null]);
  const [active, setActive] = useState<0 | 1>(0);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [full, setFull] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [hint, setHint] = useState(true);
  const activeRef = useRef<0 | 1>(0);
  activeRef.current = active;
  const uiTimer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((index: number) => {
    const item = queue.current[index];
    if (!item) return;
    pos.current = index;
    const next = (activeRef.current === 0 ? 1 : 0) as 0 | 1;
    setSlots((s) => { const n: [FeedPost | null, FeedPost | null] = [s[0], s[1]]; n[next] = item; return n; });
    setActive(next);
  }, []);

  const step = useCallback((d: number) => {
    const len = queue.current.length;
    if (!len) return;
    show((pos.current + d + len) % len);
  }, [show]);

  // Insert new approvals right after the current slide so they play next
  const enqueue = useCallback((items: FeedPost[]) => {
    const known = new Set(queue.current.map((p) => p.id));
    const fresh = items.filter((p) => !known.has(p.id));
    if (!fresh.length) return;
    const wasEmpty = queue.current.length === 0;
    queue.current.splice(pos.current + 1, 0, ...fresh);
    setCount(queue.current.length);
    if (wasEmpty) show(0);
  }, [show]);

  const fetchOne = useCallback(async (id: string) => {
    const { data } = await supabase.from('posts').select(FEED_SELECT).eq('id', id).maybeSingle();
    return data && data.is_approved ? normalize(data) : null;
  }, []);

  useEffect(() => {
    let alive = true;
    const loadAll = async (initial: boolean) => {
      const { data } = await supabase.from('posts').select(FEED_SELECT).eq('is_approved', true)
        .order('created_at', { ascending: false }).limit(500);
      if (!alive) return;
      const rows = (data ?? []).map(normalize);
      if (initial) {
        queue.current = shuffle(rows);
        setCount(rows.length); setLoaded(true);
        if (rows.length) show(0);
      } else enqueue(rows);
    };
    loadAll(true);
    const poll = setInterval(() => loadAll(false), 60000); // safety net if realtime drops

    const ch = supabase.channel('slideshow')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (p) => {
        if (!p.new.is_approved) return;
        const post = await fetchOne(p.new.id); if (post && alive) enqueue([post]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (p) => {
        if (p.new.is_approved) { const post = await fetchOne(p.new.id); if (post && alive) enqueue([post]); }
        else { queue.current = queue.current.filter((x) => x.id !== p.new.id); setCount(queue.current.length); }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (p) => {
        queue.current = queue.current.filter((x) => x.id !== p.old.id); setCount(queue.current.length);
      })
      .subscribe();
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
  }, [enqueue, fetchOne, show]);

  // Auto-advance (images). Videos advance via onEnded, with a safety timeout.
  const current = slots[active];
  useEffect(() => {
    if (!current || paused) return;
    if (current.media_type === 'image' && count < 2) return;
    const t = setTimeout(() => step(1), current.media_type === 'video' ? VIDEO_MAX_MS : IMAGE_MS);
    return () => clearTimeout(t);
  }, [current, paused, count, step]);

  // Preload the next image
  useEffect(() => {
    const nxt = queue.current[(pos.current + 1) % Math.max(1, queue.current.length)];
    if (nxt && nxt.media_type === 'image') { const i = new Image(); i.src = nxt.image_url; }
  }, [current]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key.toLowerCase() === 'f') toggleFull();
      else if (e.key.toLowerCase() === 'm') setMuted((m) => !m);
    };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    const hintT = setTimeout(() => setHint(false), 9000);
    return () => { document.removeEventListener('fullscreenchange', onFs); window.removeEventListener('keydown', onKey); clearTimeout(hintT); };
  }, [step, toggleFull]);

  // Keep the screen awake while displaying
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lock: any;
    const get = async () => { try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* unsupported */ } };
    get();
    const onVis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release?.(); };
  }, []);

  const wake = () => {
    setUiVisible(true);
    clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setUiVisible(false), 3000);
  };
  useEffect(() => { wake(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onStageClick = () => { if (!document.fullscreenElement) toggleFull(); wake(); };

  const btn = 'flex h-11 w-11 items-center justify-center rounded-full text-ivory transition hover:bg-white/15';

  return (
    <main onMouseMove={wake} onClick={onStageClick}
      className={`fixed inset-0 overflow-hidden bg-ruby-dark ${uiVisible ? '' : 'cursor-none'}`}>
      {[0, 1].map((i) => {
        const it = slots[i];
        return it ? (
          <div key={i} className={`absolute inset-0 transition-opacity duration-[1200ms] ${active === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <Slide key={it.id} item={it} active={active === i} paused={paused} muted={muted} onEnded={() => step(1)} />
          </div>
        ) : null;
      })}

      {loaded && count === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ruby-gradient px-6 text-center">
          <h1 className="font-serif text-5xl text-ivory sm:text-7xl">Umini <span className="text-gold">&amp;</span> Randeera</h1>
          <p className="mt-4 font-display text-2xl italic text-gold-light">Photos and videos will appear here once approved</p>
        </div>
      )}

      {/* Caption */}
      {current && (
        <div key={current.id} className="pointer-events-none absolute inset-x-0 bottom-0 animate-rise bg-gradient-to-t from-ruby-dark/90 via-ruby-dark/50 to-transparent px-8 pb-10 pt-24 sm:px-14">
          {current.caption && <p className="max-w-3xl font-display text-3xl italic text-ivory sm:text-4xl">{current.caption}</p>}
          <p className="mt-2 font-serif text-lg text-gold-light sm:text-xl">{current.guest_name}, Table {current.table_number}</p>
        </div>
      )}

      {/* Progress bar for images */}
      {current && current.media_type === 'image' && count > 1 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
          <div key={`${current.id}-${active}`} className="h-full origin-left animate-bar bg-gold"
            style={{ animationPlayState: paused ? 'paused' : 'running' }} />
        </div>
      )}

      {/* First-time hint */}
      {hint && !full && count > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 animate-fadeIn rounded-full border border-gold/60 bg-ruby-dark/80 px-5 py-2 text-sm text-ivory">
          Click anywhere for full screen · Space pauses · M sound · ← → to skip
        </div>
      )}

      {/* Controls */}
      <div onClick={(e) => e.stopPropagation()}
        className={`absolute right-5 top-5 flex items-center gap-1 rounded-full bg-ruby-dark/70 p-1 backdrop-blur transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button className={btn} onClick={() => step(-1)} aria-label="Previous"><SkipBack className="h-5 w-5" /></button>
        <button className={btn} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
        <button className={btn} onClick={() => step(1)} aria-label="Next"><SkipForward className="h-5 w-5" /></button>
        <button className={btn} onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute videos' : 'Mute videos'}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
        <button className={btn} onClick={toggleFull} aria-label="Toggle full screen">{full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</button>
      </div>
    </main>
  );
}
