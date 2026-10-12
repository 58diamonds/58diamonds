'use client';

import { wishlist } from './cart';
import { HAS_DATABASE } from './config';

/**
 * The wishlist lives in the browser; for a signed-in client it is also saved
 * to their account so it follows them to another device. Supabase is loaded
 * only when needed, to keep the public pages light.
 */
async function signedInDb() {
  if (!HAS_DATABASE) return null;
  const { getBrowserDb } = await import('./supabase');
  const db = getBrowserDb();
  const { data } = await db.auth.getSession();
  return data.session ? { db, userId: data.session.user.id } : null;
}

export async function toggleWishlist(pieceId: string) {
  const had = wishlist.get().includes(pieceId);
  wishlist.set((ids) => (had ? ids.filter((x) => x !== pieceId) : [...ids, pieceId]));
  const s = await signedInDb().catch(() => null);
  if (!s) return;
  if (had) await s.db.from('wishlist_items').delete().eq('user_id', s.userId).eq('piece_id', pieceId);
  else await s.db.from('wishlist_items').upsert({ user_id: s.userId, piece_id: pieceId });
}

/** After sign-in: the browser's list and the account's list become one. */
export async function mergeWishlist() {
  const s = await signedInDb().catch(() => null);
  if (!s) return;
  const { data } = await s.db.from('wishlist_items').select('piece_id').eq('user_id', s.userId);
  const remote = (data ?? []).map((r: { piece_id: string }) => r.piece_id);
  const local = wishlist.get();
  const missing = local.filter((id) => !remote.includes(id));
  if (missing.length) {
    await s.db.from('wishlist_items').upsert(missing.map((piece_id) => ({ user_id: s.userId, piece_id })));
  }
  wishlist.set([...new Set([...local, ...remote])]);
}
