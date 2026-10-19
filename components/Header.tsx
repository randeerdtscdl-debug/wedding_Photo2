'use client';
import { Presentation } from 'lucide-react';
import { useGuest } from './GuestProvider';
import Avatar from './Avatar';
import LangToggle from './LangToggle';
import { useLang } from '@/lib/i18n';

export default function Header() {
  const { profile } = useGuest();
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 bg-ruby-gradient shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-xl font-semibold text-ivory sm:text-2xl">
            Umini <span className="text-gold">&amp;</span> Randeera
          </h1>
          <p className="font-display text-base italic leading-tight text-gold-light/90">{t('tagline')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LangToggle />
          {profile && (
            <div className="flex max-w-[10.5rem] items-center gap-1.5 rounded-full border border-gold/50 py-1 pl-1 pr-1 text-xs text-ivory sm:pr-3">
              <Avatar url={profile.avatar_url} name={profile.guest_name} size={28} />
              <span className="hidden truncate sm:inline">{profile.guest_name} · T{profile.table_number}</span>
            </div>
          )}
          {/* Opens the venue slideshow in a NEW tab */}
          <a href="/slideshow" target="_blank" rel="noopener" aria-label={t('slideshowAria')} title={t('slideshow')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-ruby-dark shadow active:scale-95">
            <Presentation className="h-5 w-5" />
          </a>
        </div>
      </div>
      <div className="gold-rule" />
    </header>
  );
}
