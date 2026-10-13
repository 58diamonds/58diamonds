/**
 * "Hidden from the public": while settings.site_hidden is on, 58diamonds.com
 * shows only the logo, except to people who opened the private preview link.
 *
 * The link carries a token made from the server's secret key, so nothing has
 * to be stored and nobody can guess it. Runs in the middleware (Web Crypto).
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const PREVIEW_COOKIE = 'site_preview';
export const PREVIEW_PARAM = 'preview';

let cached: { hidden: boolean; at: number } | null = null;

/** Is the public site hidden? Read from the database at most every 30 seconds. */
export async function isSiteHidden(): Promise<boolean> {
  if (cached && Date.now() - cached.at < 30_000) return cached.hidden;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=site_hidden`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: 'no-store',
    });
    const rows = (await res.json()) as { site_hidden?: boolean }[];
    const hidden = res.ok && rows[0]?.site_hidden === true;
    cached = { hidden, at: Date.now() };
    return hidden;
  } catch {
    // Database unreachable: keep the last known answer rather than flipping the site open.
    return cached?.hidden ?? false;
  }
}

/** The secret part of the preview link, or null when the server has no secret key. */
export async function previewToken(): Promise<string | null> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('58diamonds-site-preview-1')));
  return Array.from(sig.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}
