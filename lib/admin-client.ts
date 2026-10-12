'use client';

import { useEffect, useRef } from 'react';
import { getAdminDb } from './supabase';

/**
 * Helpers shared by the admin screens. All of it runs in the browser as the
 * signed-in admin; the database's row-level security is what actually allows
 * or refuses each write.
 */

const MAX_EDGE = 2000;

/**
 * Shrink a photo before upload.
 *
 * Phone photos are 4000px and 5MB+; nobody needs that on a web page and it
 * makes the site slow. Anything larger than 2000px on its long edge is scaled
 * down and re-encoded as JPEG. Smaller files go up untouched.
 */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.86));
}

/** Upload a file as is (press PDFs, scans) and return its public URL. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const db = getAdminDb();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from('media').upload(path, file, { contentType: file.type || undefined, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return db.storage.from('media').getPublicUrl(path).data.publicUrl;
}

/** Upload an image to the media bucket and return its public URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const db = getAdminDb();
  const blob = await shrink(file);
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from('media').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
  });
  if (error) throw new Error(error.message);
  return db.storage.from('media').getPublicUrl(path).data.publicUrl;
}

/** Calls a server route as the signed-in admin. */
export async function adminFetch(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const { data } = await getAdminDb().auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(json.error ?? `Request failed (${res.status})`));
  return json;
}

/**
 * Ask the public site to drop its cache so a change shows at once instead of
 * within the minute. Best effort: if it fails the change still appears soon.
 */
export function publish() {
  return adminFetch('/api/revalidate').catch(() => undefined);
}

/**
 * Write a new order for rows that carry a `position`.
 *
 * Every row gets its index as position, so the order is always clean
 * (0, 1, 2...) no matter how it got messy.
 */
export async function saveOrder(
  table: 'sections' | 'pieces' | 'piece_images' | 'piece_variants' | 'menu_items' | 'attributes' | 'press_articles',
  ids: string[],
) {
  const db = getAdminDb();
  const results = await Promise.all(ids.map((id, position) => db.from(table).update({ position }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/** Move one item up or down in a list; returns the new list. */
export function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Download rows as a CSV file Excel opens directly. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

/** Runs `create` once when the screen was opened with ?new=1 (the Overview's "Add something" links). */
export function useNewFromLink(create: () => void, ready: boolean) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current || new URLSearchParams(window.location.search).get('new') !== '1') return;
    done.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    create();
  }, [create, ready]);
}
