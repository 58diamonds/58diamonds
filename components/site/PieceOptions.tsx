'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { formatPrice } from '@/lib/format';
import { useSite } from './SiteProvider';

export interface OptionView {
  id: string;
  /** Size, may be empty. */
  label: string;
  /** Gold colour, if the piece comes in several. */
  metal: string | null;
  name: string;
  stock: number;
  /** Own price; null = the piece's price. */
  price: number | null;
}

interface Choice {
  options: OptionView[];
  colour: string | null;
  setColour: (c: string | null) => void;
  optionId: string | null;
  setOptionId: (id: string | null) => void;
}

const Ctx = createContext<Choice | null>(null);

/** What the customer has chosen on a piece page, shared by the photos, the price and the buy box. */
export function PieceOptions({ options, children }: { options: OptionView[]; children: ReactNode }) {
  const [colour, setColour] = useState<string | null>(() => {
    const open = [
      ...new Set(
        options
          .filter((v) => v.stock > 0)
          .map((v) => v.metal)
          .filter(Boolean),
      ),
    ];
    return open.length === 1 ? open[0] : null;
  });
  const [optionId, setOptionId] = useState<string | null>(() => {
    const colours = new Set(options.map((v) => v.metal).filter(Boolean));
    const openColours = [
      ...new Set(
        options
          .filter((v) => v.stock > 0)
          .map((v) => v.metal)
          .filter(Boolean),
      ),
    ];
    const pool = colours.size ? options.filter((v) => v.metal === (openColours.length === 1 ? openColours[0] : undefined)) : options;
    const available = pool.filter((v) => v.stock > 0);
    return available.length === 1 ? available[0].id : null;
  });
  return <Ctx.Provider value={{ options, colour, setColour, optionId, setOptionId }}>{children}</Ctx.Provider>;
}

export function usePieceChoice(): Choice {
  const c = useContext(Ctx);
  // Outside a piece page (no options): nothing to choose.
  return (
    c ?? {
      options: [],
      colour: null,
      setColour: () => {},
      optionId: null,
      setOptionId: () => {},
    }
  );
}

/** The price line: the chosen option's own price once one is picked, else the server's text ("From ..."). */
export function PiecePrice({ text, basePrice, showsPrice, className }: { text: string; basePrice: number | null; showsPrice: boolean; className: string }) {
  const { currency, locale } = useSite();
  const { options, optionId } = usePieceChoice();
  const chosen = options.find((o) => o.id === optionId);
  const price = chosen && showsPrice ? (chosen.price ?? basePrice) : null;
  return <p className={className}>{price != null ? formatPrice(price, currency, locale) : text}</p>;
}
