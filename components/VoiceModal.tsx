'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { uploadWithProgress } from '@/lib/uploadWithProgress';
import { FEED_SELECT, FeedPost, fmtDuration, normalize } from '@/lib/feed';
import { useGuest } from './GuestProvider';
import VoicePlayer from './VoicePlayer';

const MAX_SEC = 120;           // recording limit
const MAX_FILE_MB = 10;        // chosen audio file limit
const EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/wav': 'wav',
};

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export default function VoiceModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (p: FeedPost) => void }) {
  const { profile } = useGuest();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; type: string; url: string; sec: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');

  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const startedAt = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const stopTracks = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => () => { clearInterval(timer.current); stopTracks(); }, []);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  async function start() {
    setErr('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      return setErr('Recording is not supported in this browser. Open the link in Chrome / Safari, or choose an audio file.');
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setErr('Microphone permission was denied. Please allow the microphone and try again.');
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = () => {
      clearInterval(timer.current);
      const type = (r.mimeType || mime || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks.current, { type });
      const sec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      stopTracks();
      setRecording(false);
      setClip({ blob, type, url: URL.createObjectURL(blob), sec });
    };
    rec.current = r;
    startedAt.current = Date.now();
    setElapsed(0);
    r.start();
    setRecording(true);
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(s);
      if (s >= MAX_SEC) r.state !== 'inactive' && r.stop();
    }, 250);
  }

  const stop = () => { if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); };

  function pickFile(f: File | undefined) {
    if (!f) return;
    setErr('');
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setErr(`That file is over ${MAX_FILE_MB} MB.`);
    const type = EXT[f.type] ? f.type : f.name.toLowerCase().endsWith('.m4a') ? 'audio/x-m4a' : '';
    if (!type) return setErr('Please choose an mp3 / m4a / wav / webm audio file.');
    const url = URL.createObjectURL(f);
    const a = new Audio(url);
    a.onloadedmetadata = () => {
      const sec = Number.isFinite(a.duration) ? Math.round(a.duration) : 0;
      if (sec > 300) { URL.revokeObjectURL(url); return setErr('Please keep voice wishes under 5 minutes.'); }
      setClip({ blob: f, type, url, sec: Math.max(1, sec) });
    };
    a.onerror = () => { URL.revokeObjectURL(url); setErr('Could not read that audio file.'); };
  }

  async function send() {
    if (!profile || !clip) return;
    setBusy(true); setErr(''); setProgress(0);
    try {
      const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[clip.type] ?? 'webm'}`;
      await uploadWithProgress(path, clip.blob, clip.type, setProgress);
      const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);
      const { data, error } = await supabase.from('posts').insert({
        user_id: profile.id, image_url: publicUrl, storage_path: path, media_type: 'audio',
        duration_sec: Math.min(clip.sec, 600), caption: caption.trim() || null, table_number: profile.table_number,
      }).select(FEED_SELECT).single();
      if (error) throw error;
      onUploaded(normalize(data));
      onClose();
    } catch (e) {
      console.error(e);
      setErr('Upload failed. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onClick={() => !busy && !recording && onClose()}>
      <div onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92vh] w-full max-w-md animate-sheetUp overflow-y-auto rounded-t-3xl bg-ivory p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ruby">Leave a voice wish</h2>
          <button onClick={onClose} disabled={busy || recording} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {!clip ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gold bg-parchment-50 px-4 py-8">
            {recording ? (
              <>
                <span className="relative flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-ruby/30" />
                  <button onClick={stop} aria-label="Stop recording"
                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-ruby-gradient text-gold-light shadow-lg ring-2 ring-gold">
                    <Square className="h-7 w-7 fill-current" />
                  </button>
                </span>
                <p className="font-serif text-2xl tabular-nums text-ruby">{fmtDuration(elapsed)}</p>
                <p className="text-xs text-cocoa/60">Recording… tap to stop (max {fmtDuration(MAX_SEC)})</p>
              </>
            ) : (
              <>
                <button onClick={start} aria-label="Start recording"
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-ruby-gradient text-gold-light shadow-lg ring-2 ring-gold active:scale-95">
                  <Mic className="h-8 w-8" />
                </button>
                <p className="text-sm font-medium text-ruby">Tap to record your wish</p>
                <button type="button" className="text-xs text-cocoa/60 underline" onClick={() => fileInput.current?.click()}>
                  or choose an audio file
                </button>
                <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
              </>
            )}
          </div>
        ) : (
          <div>
            <VoicePlayer src={clip.url} durationSec={clip.sec} seed={clip.url} />
            {!busy && (
              <button className="mt-2 flex items-center gap-1.5 text-xs text-cocoa/60" onClick={() => setClip(null)}>
                <Trash2 className="h-3.5 w-3.5" />Record again
              </button>
            )}
          </div>
        )}

        <textarea className="field mt-4 resize-none" rows={2} maxLength={280} value={caption}
          onChange={(e) => setCaption(e.target.value)} placeholder="Add a written wish too (optional)" />
        <p className="mt-3 text-xs text-cocoa/60">The hosts review every wish before it appears in the gallery.</p>
        {err && <p className="mt-3 text-sm text-ruby">{err}</p>}

        <button className="btn-ruby mt-5 w-full" disabled={busy || !clip} onClick={send}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading · {progress}%</> : <><Upload className="h-4 w-4" />Send for approval</>}
        </button>
      </div>
    </div>
  );
}
