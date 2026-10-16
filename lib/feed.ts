export const EVENT_WATERMARK = 'Umini & Randeera • 22 Oct 2026';

export type MediaType = 'image' | 'video';

export type FeedPost = {
  id: string;
  user_id: string;
  image_url: string; // public URL of the photo OR video
  storage_path: string;
  caption: string | null;
  table_number: string;
  media_type: MediaType;
  is_approved: boolean;
  created_at: string;
  guest_name: string;
  like_count: number;
  comment_count: number;
};

export const FEED_SELECT =
  'id,user_id,image_url,storage_path,caption,table_number,media_type,is_approved,created_at,profiles(guest_name),likes(count),comments(count)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalize(r: any): FeedPost {
  return {
    id: r.id,
    user_id: r.user_id,
    image_url: r.image_url,
    storage_path: r.storage_path,
    caption: r.caption,
    table_number: r.table_number,
    media_type: r.media_type === 'video' ? 'video' : 'image',
    is_approved: !!r.is_approved,
    created_at: r.created_at,
    guest_name: r.profiles?.guest_name ?? 'Guest',
    like_count: r.likes?.[0]?.count ?? 0,
    comment_count: r.comments?.[0]?.count ?? 0,
  };
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
