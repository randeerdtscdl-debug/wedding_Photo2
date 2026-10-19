'use client';
import { Languages } from 'lucide-react';
import { useLang } from '@/lib/i18n';

/** Switches the whole site between English and සිංහල (remembered on this phone). */
export default function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <button type="button" onClick={() => setLang(lang === 'en' ? 'si' : 'en')} aria-label="Language / භාෂාව"
      className={`flex items-center gap-1.5 rounded-full border border-gold/60 px-3 py-1.5 text-xs font-medium text-gold-light active:scale-95 ${className}`}>
      <Languages className="h-3.5 w-3.5" />{t('langBtn')}
    </button>
  );
}
