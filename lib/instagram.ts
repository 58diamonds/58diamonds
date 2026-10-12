import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Instagram sync, the same approach as the tannin site.
 *
 * Two kinds of token work, detected on connect:
 *  - Instagram API with Instagram Login (graph.instagram.com), for Business
 *    and Creator accounts. Long-lived tokens refresh themselves here.
 *  - Facebook Login (graph.facebook.com) for an Instagram Business account
 *    linked to a Facebook Page. Refreshing needs INSTAGRAM_APP_ID/SECRET.
 *
 * Every synced image is downloaded and stored in our own `media` bucket,
 * because Instagram's image links expire after a few days.
 */

const FB_API = 'https://graph.facebook.com/v21.0';
const IG_API = 'https://graph.instagram.com/v21.0';
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';

const KEYS = {
  token: 'instagram_access_token',
  expires: 'instagram_token_expires_at',
  userId: 'instagram_user_id',
  apiBase: 'instagram_api_base',
  username: 'instagram_username',
  lastSync: 'instagram_last_synced_at',
} as const;

interface IgMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

type Tokens = { accessToken: string; expiresAt: string };

async function settings(db: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await db.from('app_settings').select('key,value').in('key', Object.values(KEYS));
  return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
}

async function save(db: SupabaseClient, values: Record<string, string>) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  const { error } = await db.from('app_settings').upsert(rows);
  if (error) throw new Error(error.message);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Instagram returned ${res.status}`);
  return data;
}

function expiry(seconds?: number) {
  return new Date(Date.now() + (seconds ?? 60 * 86400) * 1000).toISOString();
}

async function exchangeFbToken(token: string): Promise<Tokens | null> {
  const id = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!id || !secret) return null;
  const d = await getJson<{ access_token: string; expires_in?: number }>(
    `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${id}&client_secret=${secret}&fb_exchange_token=${encodeURIComponent(token)}`,
  );
  return { accessToken: d.access_token, expiresAt: expiry(d.expires_in) };
}

async function refreshIgToken(token: string): Promise<Tokens> {
  const d = await getJson<{ access_token: string; expires_in?: number }>(
    `${IG_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
  return { accessToken: d.access_token, expiresAt: expiry(d.expires_in) };
}

/** Which account does this token reach, and through which API? */
async function discover(token: string): Promise<{ userId: string; username: string; apiBase: string }> {
  const ig = await fetch(`${IG_API}/me?fields=id,username&access_token=${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (ig.ok) {
    const d = (await ig.json()) as { id?: string; username?: string };
    if (d.id) return { userId: d.id, username: d.username ?? '', apiBase: IG_API };
  }
  const fb = await getJson<{ data?: Array<{ instagram_business_account?: { id: string; username: string } }> }>(
    `${FB_API}/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`,
  );
  const account = (fb.data ?? []).map((p) => p.instagram_business_account).find((a) => a?.id);
  if (!account) {
    throw new Error('This token does not reach an Instagram Business or Creator account.');
  }
  return { userId: account.id, username: account.username, apiBase: FB_API };
}

export async function connectInstagram(db: SupabaseClient, token: string) {
  const account = await discover(token);
  let tokens: Tokens = { accessToken: token, expiresAt: expiry() };
  if (account.apiBase === FB_API) {
    tokens = (await exchangeFbToken(token)) ?? tokens;
  } else {
    // A short-lived Instagram token cannot be refreshed; a long-lived one can,
    // and refreshing it now also tells us its real expiry.
    tokens = await refreshIgToken(token).catch(() => tokens);
  }
  await save(db, {
    [KEYS.token]: tokens.accessToken,
    [KEYS.expires]: tokens.expiresAt,
    [KEYS.userId]: account.userId,
    [KEYS.apiBase]: account.apiBase,
    [KEYS.username]: account.username,
  });
  return { username: account.username, expiresAt: tokens.expiresAt };
}

export async function disconnectInstagram(db: SupabaseClient) {
  await db.from('app_settings').delete().in('key', Object.values(KEYS));
}

export async function instagramStatus(db: SupabaseClient) {
  const s = await settings(db);
  return {
    connected: Boolean(s[KEYS.token]),
    username: s[KEYS.username] ?? null,
    expiresAt: s[KEYS.expires] ?? null,
    lastSyncedAt: s[KEYS.lastSync] ?? null,
  };
}

/**
 * Pull the latest posts into instagram_posts.
 *
 * New posts get their image copied into our bucket. Posts already here keep
 * their image and their visibility (a post the client hid stays hidden); only
 * the caption and link are refreshed.
 */
export async function syncInstagram(db: SupabaseClient, limit = 24): Promise<number> {
  const s = await settings(db);
  let token = s[KEYS.token];
  if (!token) throw new Error('No Instagram account is connected yet.');
  const apiBase = s[KEYS.apiBase] ?? IG_API;

  // Refresh when under 20 days remain, so the token never lapses.
  const expiresAt = s[KEYS.expires];
  if (expiresAt && new Date(expiresAt).getTime() - Date.now() < 20 * 86400_000) {
    try {
      const fresh = apiBase === FB_API ? await exchangeFbToken(token) : await refreshIgToken(token);
      if (fresh) {
        token = fresh.accessToken;
        await save(db, { [KEYS.token]: fresh.accessToken, [KEYS.expires]: fresh.expiresAt });
      }
    } catch {
      // Carry on with the current token; the admin shows the expiry date.
    }
  }

  const who = s[KEYS.userId] ?? 'me';
  const { data: media = [] } = await getJson<{ data?: IgMedia[] }>(
    `${apiBase}/${who}/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
  );

  const { data: existing } = await db.from('instagram_posts').select('instagram_id');
  const known = new Set((existing ?? []).map((r: { instagram_id: string }) => r.instagram_id));

  let count = 0;
  for (const post of media) {
    const source = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
    if (!source) continue;

    if (known.has(post.id)) {
      await db
        .from('instagram_posts')
        .update({ caption: post.caption ?? '', permalink: post.permalink })
        .eq('instagram_id', post.id);
      count++;
      continue;
    }

    let imageUrl = source;
    try {
      const img = await fetch(source, { cache: 'no-store' });
      if (img.ok) {
        const path = `instagram/${post.id}.jpg`;
        const { error } = await db.storage
          .from('media')
          .upload(path, Buffer.from(await img.arrayBuffer()), { contentType: 'image/jpeg', upsert: true });
        if (!error) imageUrl = db.storage.from('media').getPublicUrl(path).data.publicUrl;
      }
    } catch {
      // Keep Instagram's own link for now; it is replaced on a later sync.
    }

    const { error } = await db.from('instagram_posts').insert({
      instagram_id: post.id,
      image_url: imageUrl,
      caption: post.caption ?? '',
      permalink: post.permalink,
      media_type: post.media_type,
      taken_at: post.timestamp,
    });
    if (!error) count++;
  }

  await save(db, { [KEYS.lastSync]: new Date().toISOString() });
  return count;
}
