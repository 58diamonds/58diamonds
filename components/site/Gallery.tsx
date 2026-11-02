'use client';

import { useEffect, useState } from 'react';
import { usePieceChoice } from './PieceOptions';
import { Photo } from './Photo';

export function Gallery({ images: all, title }: { images: { id: string; url: string; alt: string; metal?: string | null }[]; title: string }) {
  const { colour } = usePieceChoice();
  // With a gold colour chosen: that colour's photos first, then the ones that fit every colour.
  const own = colour ? all.filter((i) => i.metal === colour) : [];
  const images = own.length ? [...own, ...all.filter((i) => !i.metal)] : all;
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [colour]);
  const current = images[index] ?? images[0];
  return (
    <div>
      <div className="overflow-hidden bg-[var(--color-pearl)]">
        <Photo src={current?.url} alt={current?.alt || title} eager className="aspect-square w-full" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${images.length}`}
              aria-current={i === index}
              className={`overflow-hidden border ${i === index ? 'border-[var(--color-gold)]' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <Photo src={img.url} alt="" className="aspect-square w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
