import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'admin_session';
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

const sign = (v: string) =>
  crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(v).digest('hex');

export function createToken() {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function passwordMatches(input: string) {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD ?? '').digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)))) return false;
  } catch {
    return false;
  }
  return Number(exp) > Date.now();
}
