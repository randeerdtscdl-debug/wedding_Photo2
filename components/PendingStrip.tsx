'use client';
import { Hourglass } from 'lucide-react';
import { FeedPost } from '@/lib/feed';

/** Shows the guest their own uploads that are still waiting for host approval. */
export default function PendingStrip({ posts }: { posts: FeedPost[] }) {
  if (!posts.length) return null;
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-gold/50 bg-parchment-50 p-3">
      <Hourglass className="h-5 w-5 shrink-0 text-gold-dark" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{posts.length === 1 ? 'Your upload is' : `${posts.length} uploads are`} waiting for approval</p>
        <p className="text-xs text-cocoa/60">It will appear in the feed as soon as the hosts approve it.</p>
      </div>
      <div className="flex -space-x-2">
        {posts.slice(0, 4).map((p) =>
          p.media_type === 'video' ? (
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
