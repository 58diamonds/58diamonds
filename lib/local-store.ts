'use client';

import { useSyncExternalStore } from 'react';

/**
 * A small value kept in the browser (localStorage) that every component can
 * watch: the bag and the wishlist. Changes in another tab show up too.
 */
export function localStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    try {
      value = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      value = fallback;
    }
    cache = { raw, value };
    return value;
  }

  function write(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private mode: the change lives until the page closes */
      cache = { raw: JSON.stringify(next), value: next };
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  return {
    get: read,
    set: (update: T | ((prev: T) => T)) => write(typeof update === 'function' ? (update as (p: T) => T)(read()) : update),
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
  };
}
