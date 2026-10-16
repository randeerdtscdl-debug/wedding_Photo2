'use client';
import { memo } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { FeedPost, timeAgo } from '@/lib/feed';

type Props = {
  post: FeedPost; liked: boolean;
  onLike: (p: FeedPost) => void; onComment: (p: FeedPost) => void;
};

function PhotoCard({ post, liked, onLike, onComment }: Props) {
  const isVideo = post.media_type === 'video';
  return (
    <article className="card-shadow mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-gold/30 bg-white">
      {isVideo ? (
        // #t=0.1 makes iOS show the first frame as a poster
        <video src={`${post.image_url}#t=0.1`} controls playsInline preload="metadata"
          className="max-h-[70vh] min-h-[160px] w-full bg-ruby-dark object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt={post.caption ?? `Photo by ${post.guest_name}`}
          loading="lazy" decoding="async" onDoubleClick={() => !liked && onLike(post)}
          className="min-h-[160px] w-full bg-parchment-100 object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{post.guest_name}
            <span className="ml-1.5 rounded-full bg-parchment-100 px-2 py-0.5 text-[10px] text-ruby">Table {post.table_number}</span>
          </span>
          <span className="text-cocoa/50">{timeAgo(post.created_at)}</span>
        </div>
        {post.caption && <p className="mt-2 font-display text-lg italic leading-snug">{post.caption}</p>}
        <div className="mt-3 flex items-center gap-5">
          <button onClick={() => onLike(post)} aria-pressed={liked} aria-label="Like" className="flex items-center gap-1.5 text-sm">
            <Heart key={String(liked)} className={`h-6 w-6 transition ${liked ? 'animate-pop fill-ruby text-ruby' : 'text-cocoa/60'}`} />
            <span className="tabular-nums">{post.like_count}</span>
          </button>
          <button onClick={() => onComment(post)} aria-label="Comments" className="flex items-center gap-1.5 text-sm text-cocoa/70">
            <MessageCircle className="h-6 w-6" /><span className="tabular-nums">{post.comment_count}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
export default memo(PhotoCard);
