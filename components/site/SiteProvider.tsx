'use client';

import { createContext, useContext, useMemo } from 'react';
import { fill, type Locale } from '@/lib/i18n';
import type { TextKey } from '@/lib/texts';

export interface SiteContext {
  locale: Locale;
  currency: string;
  texts: Record<string, string>;
  features: { shop: boolean; accounts: boolean; wishlist: boolean; newsletter: boolean };
  whatsapp: string | null;
}

const Ctx = createContext<SiteContext | null>(null);

/** Hands the visitor's language, its texts and a few settings to client components. */
export function SiteProvider({ value, children }: { value: SiteContext; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSite outside SiteProvider');
  const { texts } = ctx;
  const t = useMemo(
    () => (key: TextKey, vars?: Record<string, string | number>) => (vars ? fill(texts[key] ?? '', vars) : texts[key] ?? ''),
    [texts],
  );
  return { ...ctx, t };
}
