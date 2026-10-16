'use client';
import { Heart, MessageCircle } from 'lucide-react';
import { FeedPost, timeAgo } from '@/lib/feed';
import Avatar from './Avatar';

export function PostHeader({ post }: { post: FeedPost }) {
  return (
    <div className="flex items-center gap-2.5 p-3">
      <Avatar url={post.avatar_url} name={post.guest_name} size={36} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">{post.guest_name}</p>
        <p className="text-[11px] text-cocoa/50">
          <span className="text-ruby">Table {post.table_number}</span> · {timeAgo(post.created_at)}
        </p>
      </div>
    </div>
  );
}

type ActionProps = {
  post: FeedPost; liked: boolean;
  onLike: (p: FeedPost) => void; onComment: (p: FeedPost) => void; onShowLikes: (p: FeedPost) => void;
};

/** Heart toggles the like; the number next to it opens the "who liked this" list (like Facebook). */
export function PostActions({ post, liked, onLike, onComment, onShowLikes }: ActionProps) {
  return (
    <div className="flex items-center gap-4 px-3 pb-3 pt-2">
      <div className="flex items-center gap-2">
        <button onClick={() => onLike(post)} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'}>
          <Heart key={String(liked)} className={`h-6 w-6 transition ${liked ? 'animate-pop fill-ruby text-ruby' : 'text-cocoa/60'}`} />
        </button>
        {/* tap the text to see who liked (Facebook style) */}
        <button onClick={() => post.like_count > 0 && onShowLikes(post)} disabled={post.like_count === 0}
          aria-label="See who liked this"
          className="rounded-full bg-parchment-50 px-2.5 py-1 text-xs font-medium tabular-nums text-ruby enabled:underline enabled:underline-offset-2 disabled:bg-transparent disabled:font-normal disabled:text-cocoa/50 disabled:no-underline">
          {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
        </button>
      </div>
      <button onClick={() => onComment(post)} aria-label="Comments" className="flex items-center gap-1.5 text-sm text-cocoa/70">
        <MessageCircle className="h-6 w-6" /><span className="tabular-nums">{post.comment_count}</span>
      </button>
    </div>
  );
}
