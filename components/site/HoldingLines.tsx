'use client';

import { useEffect, useRef, useState } from 'react';

const LINES = ['Every stone, chosen by my own hand.', 'Your story, set in gold.', "The coffee's on, come and try things on.", 'Antwerp, by appointment.'];

/**
 * A few words from Farah under the logo on the holding page. Each line lands
 * at a random spot from left to right on every visit; the group as a whole
 * stays centred under the logo.
 */
export function HoldingLines() {
  const box = useRef<HTMLDivElement>(null);
  const [xs, setXs] = useState<number[] | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Drawn once per visit. On iPhone, pulling the page or the toolbar
    // sliding in fires resize events; new random spots each time made the
    // lines jump about, so only a real width change re-lays them, keeping
    // the same draw.
    const draw = LINES.map(() => Math.random());
    let width = -1;
    const place = () => {
      const w = el.clientWidth;
      if (w === width) return;
      width = w;
      const ps = [...el.children] as HTMLElement[];
      const pos = ps.map((p, i) => draw[i] * Math.max(0, w - p.offsetWidth));
      const left = Math.min(...pos);
      const right = Math.max(...pos.map((x, i) => x + ps[i].offsetWidth));
      const shift = (w - (right - left)) / 2 - left;
      setXs(pos.map((x) => x + shift));
    };
    document.fonts.ready.then(place);
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  return (
    <div ref={box} className="mx-auto mt-10 flex w-[min(24rem,calc(100vw-4rem))] flex-col gap-2 sm:mt-12 sm:w-96">
      {LINES.map((line, i) => (
        <p
          key={line}
          className={`w-max max-w-full whitespace-nowrap font-[family-name:var(--font-display)] text-[clamp(1.05rem,4.4vw,1.35rem)] italic leading-tight transition-opacity duration-700 ${i % 2 ? 'text-[#8A6A3B]' : 'text-[var(--color-ink)]'}`}
          style={{ transform: `translateX(${xs ? xs[i] : 0}px)`, opacity: xs ? 1 : 0 }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}
