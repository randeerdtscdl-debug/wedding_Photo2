'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Loader2, Film } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { prepareImage } from '@/lib/imageCompression';
import { uploadWithProgress } from '@/lib/uploadWithProgress';
import { EVENT_WATERMARK, FEED_SELECT, FeedPost, normalize } from '@/lib/feed';
import { useGuest } from './GuestProvider';

const MAX_FILES = 6;
const MAX_VIDEO_MB = 50; // matches the storage bucket limit

const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name);
const videoType = (f: File) => (f.type && f.type.startsWith('video/') ? f.type : /\.mov$/i.test(f.name) ? 'video/quicktime' : 'video/mp4');
const videoExt = (t: string) => (t === 'video/quicktime' ? 'mov' : t === 'video/webm' ? 'webm' : 'mp4');

export default function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (p: FeedPost) => void }) {
  const { profile } = useGuest();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; video: boolean }[]>([]);
  const [caption, setCaption] = useState('');
  const [watermark, setWatermark] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const items = files.map((f) => ({ url: URL.createObjectURL(f), video: isVideoFile(f) }));
    setPreviews(items);
    return () => items.forEach((i) => URL.revokeObjectURL(i.url));
  }, [files]);

  function pick(list: FileList | null) {
    setErr('');
    const chosen = Array.from(list ?? []).slice(0, MAX_FILES);
    const ok = chosen.filter((f) => !(isVideoFile(f) && f.size > MAX_VIDEO_MB * 1024 * 1024));
    if (ok.length < chosen.length) setErr(`Some videos are over ${MAX_VIDEO_MB} MB and were skipped. Pick a shorter clip (about 20–30 seconds).`);
    setFiles(ok);
  }

  async function upload() {
    if (!profile || !files.length) return;
    setBusy(true); setErr('');
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const video = isVideoFile(f);
        const tag = `${i + 1}/${files.length}`;
        setProgress(video ? `Video ${tag}…` : `Photo ${tag}…`);

        let body: Blob = f;
        let contentType: string;
        let ext: string;
        if (video) {
          contentType = videoType(f); ext = videoExt(contentType);
        } else {
          body = await prepareImage(f, { watermark: watermark ? EVENT_WATERMARK : undefined });
          contentType = 'image/jpeg'; ext = 'jpg';
        }

        const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await uploadWithProgress(path, body, contentType, (pct) => setProgress(`${video ? 'Video' : 'Photo'} ${tag} · ${pct}%`));
        const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);

        // is_approved defaults to false → goes to the hosts' approval queue
        const { data, error } = await supabase.from('posts').insert({
          user_id: profile.id, image_url: publicUrl, storage_path: path, media_type: video ? 'video' : 'image',
          caption: caption.trim() || null, table_number: profile.table_number,
        }).select(FEED_SELECT).single();
        if (error) throw error;
        onUploaded(normalize(data));
      }
      onClose();
    } catch (e) {
      console.error(e);
      setErr('Upload failed. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92vh] w-full max-w-md animate-sheetUp overflow-y-auto rounded-t-3xl bg-ivory p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ruby">Share a moment</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => pick(e.target.files)} />

        {previews.length === 0 ? (
          <button onClick={() => input.current?.click()}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold bg-parchment-50 text-ruby">
            <span className="flex items-center gap-3"><ImagePlus className="h-9 w-9" /><Film className="h-9 w-9" /></span>
            <span className="text-sm font-medium">Take or choose photos & videos</span>
            <span className="text-xs text-cocoa/50">Up to {MAX_FILES} files · videos up to {MAX_VIDEO_MB} MB</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((p, i) =>
              p.video ? (
                <video key={p.url} src={`${p.url}#t=0.1`} muted playsInline preload="metadata" className="aspect-square w-full rounded-xl bg-ruby-dark object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.url} src={p.url} alt={`Preview ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
              ))}
          </div>
        )}

        <textarea className="field mt-4 resize-none" rows={2} maxLength={280} value={caption}
          onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)" />
        <label className="mt-3 flex items-center gap-2 text-sm text-cocoa/70">
          <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} className="accent-[#8B0000]" />
          Add “{EVENT_WATERMARK}” to photos
        </label>
        <p className="mt-3 text-xs text-cocoa/60">The hosts review every upload before it appears in the gallery.</p>
        {err && <p className="mt-3 text-sm text-ruby">{err}</p>}

        <div className="mt-5 flex gap-2">
          {previews.length > 0 && !busy && <button className="btn-outline" onClick={() => input.current?.click()}>Change</button>}
          <button className="btn-ruby flex-1" disabled={busy || !files.length} onClick={upload}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{progress}</> : 'Send for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
