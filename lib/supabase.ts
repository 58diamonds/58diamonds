import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

const browser: Record<string, SupabaseClient> = {};

function browserClient(storageKey: string): SupabaseClient {
  if (!browser[storageKey]) {
    browser[storageKey] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey },
    });
  }
  return browser[storageKey];
}

/**
 * The browser client for clients' accounts (sign-in, orders, wishlist).
 *
 * Created lazily: at build time the env vars may be absent and a module-level
 * client would fail the build. It holds the anon key only; row-level security
 * decides what each signed-in person may read or change.
 */
export function getBrowserDb(): SupabaseClient {
  return browserClient('58d-client');
}

/** The admin's browser client: a separate session, so Farah can test the shop as a client in the same browser. */
export function getAdminDb(): SupabaseClient {
  return browserClient('58d-admin');
}

/** A stateless client for server-side reads of public content. */
export function getPublicDb(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

/** Service-role client for server routes. Never import this from client code. */
export function getServiceDb(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
