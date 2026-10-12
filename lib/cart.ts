'use client';

import { localStore } from './local-store';

export interface CartLine {
  pieceId: string;
  variantId: string | null;
  quantity: number;
}

/** The bag, kept in the browser until checkout. Prices are never stored here: the server always looks them up. */
export const cart = localStore<CartLine[]>('58d-bag', []);

export function addToCart(pieceId: string, variantId: string | null, max: number) {
  cart.set((lines) => {
    const i = lines.findIndex((l) => l.pieceId === pieceId && l.variantId === variantId);
    if (i < 0) return [...lines, { pieceId, variantId, quantity: 1 }];
    const copy = [...lines];
    copy[i] = { ...copy[i], quantity: Math.min(max, copy[i].quantity + 1) };
    return copy;
  });
}

export function setQuantity(pieceId: string, variantId: string | null, quantity: number) {
  cart.set((lines) =>
    lines
      .map((l) => (l.pieceId === pieceId && l.variantId === variantId ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0),
  );
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

/** Saved pieces of a visitor; merged into their account when they sign in. */
export const wishlist = localStore<string[]>('58d-wishlist', []);
