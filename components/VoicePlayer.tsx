'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { fmtDuration } from '@/lib/feed';
import { useLang } from '@/lib/i18n';

let playing: HTMLAudioElement | null = null; // only one voice plays at a time

function bars(seed: string, n = 36) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Array.from({ length: n }, () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return 22 + (Math.abs(h) % 78); });
}

export default function VoicePlayer({ src, durationSec, seed }: { src: string; durationSec: number | null; seed: string }) {
  const { t: tr } = useLang();
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  const heights = useMemo(() => bars(seed), [seed]);

  // MediaRecorder files often report an infinite duration, so we prefer the stored value
  const total = durationSec && durationSec > 0 ? durationSec : 0;
  const pct = total ? Math.min(1, t / total) : 0;

  useEffect(() => () => { if (playing === audio.current) playing = null; }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      if (playing && playing !== a) playing.pause();
      playing = a;
      a.play().catch(() => setOn(false));
    } else a.pause();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-parchment-50 p-3">
      <audio ref={audio} src={src} preload="none"
        onPlay={() => setOn(true)} onPause={() => setOn(false)}
        onEnded={() => { setOn(false); setT(0); }} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} />
      <button type="button" onClick={toggle} aria-label={on ? tr('pauseVoice') : tr('playVoice')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ruby-gradient text-gold-light shadow ring-1 ring-gold/60 active:scale-95">
        {on ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="flex h-10 flex-1 items-center gap-[2px]" aria-hidden>
        {heights.map((h, i) => (
          <span key={i} style={{ height: `${h}%` }}
            className={`w-full max-w-[5px] rounded-full transition-colors ${i / heights.length < pct ? 'bg-ruby' : 'bg-gold/50'}`} />
        ))}
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-cocoa/60">{fmtDuration(on || t > 0 ? t : total)}</span>
    </div>
  );
}
