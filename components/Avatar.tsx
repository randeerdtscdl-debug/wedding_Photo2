'use client';

/** Round profile picture; falls back to the guest's initial. */
export default function Avatar({ url, name, size = 36, className = '' }: { url?: string | null; name: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={style} loading="lazy" decoding="async"
      className={`shrink-0 rounded-full border border-gold/60 bg-parchment-100 object-cover ${className}`} />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.42 }} aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-ruby-gradient font-serif text-gold-light ${className}`}>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}
