'use client';
import { memo } from 'react';
import { FeedPost } from '@/lib/feed';
import { PostActions, PostHeader } from './PostParts';
import VoicePlayer from './VoicePlayer';

type Props = {
  post: FeedPost; liked: boolean;
  onLike: (p: FeedPost) => void; onComment: (p: FeedPost) => void; onShowLikes: (p: FeedPost) => void;
};

function VoiceCard({ post, liked, onLike, onComment, onShowLikes }: Props) {
  return (
    <article className="card-shadow mb-4 overflow-hidden rounded-2xl border border-gold/30 bg-white">
      <PostHeader post={post} />
      <div className="px-3">
        <VoicePlayer src={post.image_url} durationSec={post.duration_sec} seed={post.id} />
        {post.caption && <p className="mt-3 font-display text-lg italic leading-snug">{post.caption}</p>}
      </div>
      <PostActions post={post} liked={liked} onLike={onLike} onComment={onComment} onShowLikes={onShowLikes} />
    </article>
  );
}
export default memo(VoiceCard);
