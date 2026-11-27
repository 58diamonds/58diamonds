/**
 * Unique visitor counter (Admin > Overview).
 *
 * Each page opened on the public site is noted once per day per visitor. A
 * visitor is a one-way code made from their IP address and browser with the
 * server's secret key: the IP address itself is never stored, and the code
 * cannot be turned back into it. No cookies. Bots and link previews are not
 * counted. Runs in the middleware (Web Crypto).
 */
import { SUPABASE_URL } from './config';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|skype|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios|go-http|java\/|okhttp|vercel/i;

/** Is this a person's browser (and not a bot, a link preview or a prefetch)? */
export function isCountable(headers: Headers): boolean {
  const ua = headers.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return false;
  if (headers.get('next-router-prefetch') || headers.get('rsc')) return false;
  const purpose = `${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''} ${headers.get('x-purpose') ?? ''}`;
  if (/prefetch|preview/i.test(purpose)) return false;
  return true;
}

/** The visitor's IP address as Vercel passes it on. */
export function clientIp(headers: Headers): string {
  return headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
}

/** Today's date in Antwerp, as YYYY-MM-DD. */
export function brusselsDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The one-way code for a visitor: the same IP address and browser always give the same code. */
export async function visitorId(secret: string, ip: string, userAgent: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`58diamonds-visitors-1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ip}|${userAgent}`)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Visitors already noted today by this server, so a visitor opening ten pages
// costs one database write, not ten.
let seen = { day: '', ids: new Set<string>() };

/** Note this visit. Never throws: counting must never break the site. */
export async function recordVisit(headers: Headers): Promise<void> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !SUPABASE_URL || !isCountable(headers)) return;
  const ip = clientIp(headers);
  if (!ip) return;
  try {
    const day = brusselsDay();
    const visitor = await visitorId(secret, ip, headers.get('user-agent') ?? '');
    if (seen.day !== day) seen = { day, ids: new Set() };
    if (seen.ids.has(visitor)) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_visits`, {
      method: 'POST',
      headers: { apikey: secret, authorization: `Bearer ${secret}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ day, visitor }),
      cache: 'no-store',
    });
    if (res.ok) {
      if (seen.ids.size > 50_000) seen.ids.clear();
      seen.ids.add(visitor);
    }
  } catch {
    // Database unreachable: this visit is simply not counted.
  }
}
