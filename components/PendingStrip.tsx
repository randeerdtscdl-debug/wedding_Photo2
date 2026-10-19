'use client';
import { Hourglass, Mic } from 'lucide-react';
import { FeedPost } from '@/lib/feed';
import { useLang } from '@/lib/i18n';

/** Shows the guest their own uploads that are still waiting for host approval. */
export default function PendingStrip({ posts }: { posts: FeedPost[] }) {
  const { t } = useLang();
  if (!posts.length) return null;
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-gold/50 bg-parchment-50 p-3">
      <Hourglass className="h-5 w-5 shrink-0 text-gold-dark" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{posts.length === 1 ? t('pendingOne') : t('pendingMany', { n: posts.length })}</p>
        <p className="text-xs text-cocoa/60">{t('pendingSub')}</p>
      </div>
      <div className="flex -space-x-2">
        {posts.slice(0, 4).map((p) =>
          p.media_type === 'audio' ? (
            <span key={p.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ivory bg-ruby-gradient text-gold-light"><Mic className="h-4 w-4" /></span>
          ) : p.media_type === 'video' ? (
            <video key={p.id} src={`${p.image_url}#t=0.1`} muted playsInline preload="metadata"
              className="h-10 w-10 rounded-full border-2 border-ivory object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.image_url} alt="" className="h-10 w-10 rounded-full border-2 border-ivory object-cover" />
          ))}
      </div>
    </div>
  );
}
