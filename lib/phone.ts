// Shared (client + server) phone helpers. Sri Lankan numbers are matched in every common format:
// 0771234567 · +94771234567 · 94771234567 · 771234567
const SL = /^(?:\+?94|0)?(\d{9})$/;

export function cleanPhone(raw: string): string | null {
  const v = raw.replace(/[\s\-().]/g, '');
  return /^\+?\d{9,15}$/.test(v) ? v : null;
}

/** Canonical form stored in the DB (SL numbers → 0XXXXXXXXX). */
export function normalizePhone(raw: string): string | null {
  const v = cleanPhone(raw);
  if (!v) return null;
  const m = v.match(SL);
  return m ? `0${m[1]}` : v;
}

/** Every format a number could have been saved in (used for lookups). */
export function phoneVariants(raw: string): string[] {
  const v = cleanPhone(raw);
  if (!v) return [];
  const m = v.match(SL);
  return m ? [`0${m[1]}`, `+94${m[1]}`, `94${m[1]}`, m[1]] : [v];
}
