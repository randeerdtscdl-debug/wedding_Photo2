'use client';
import { Presentation, UserRound } from 'lucide-react';
import { useGuest } from './GuestProvider';

export default function Header() {
  const { profile } = useGuest();
  return (
    <header className="sticky top-0 z-30 bg-ruby-gradient shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-xl font-semibold text-ivory sm:text-2xl">
            Umini <span className="text-gold">&amp;</span> Randeera
          </h1>
          <p className="font-display text-base italic leading-tight text-gold-light/90">Share the moments you love</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {profile && (
            <div className="flex max-w-[9.5rem] items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1.5 text-xs text-ivory">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{profile.guest_name} · T{profile.table_number}</span>
            </div>
          )}
          {/* Opens the venue slideshow in a NEW tab */}
          <a href="/slideshow" target="_blank" rel="noopener" aria-label="Open slideshow in a new tab" title="Slideshow"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-ruby-dark shadow active:scale-95">
            <Presentation className="h-5 w-5" />
          </a>
        </div>
      </div>
      <div className="gold-rule" />
    </header>
  );
}
