'use client';
import { memo } from 'react';
import { FeedPost } from '@/lib/feed';
import { PostActions, PostHeader } from './PostParts';

type Props = {
  post: FeedPost; liked: boolean;
  onLike: (p: FeedPost) => void; onComment: (p: FeedPost) => void; onShowLikes: (p: FeedPost) => void;
};

function PhotoCard({ post, liked, onLike, onComment, onShowLikes }: Props) {
  const isVideo = post.media_type === 'video';
  return (
    <article className="card-shadow mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-gold/30 bg-white">
      <PostHeader post={post} />
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
      {post.caption && <p className="px-3 pt-3 font-display text-lg italic leading-snug">{post.caption}</p>}
      <PostActions post={post} liked={liked} onLike={onLike} onComment={onComment} onShowLikes={onShowLikes} />
    </article>
  );
}
export default memo(PhotoCard);
