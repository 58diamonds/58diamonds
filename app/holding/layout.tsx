import type { Metadata } from 'next';
import { fontVars, script } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: '58 Diamonds',
  robots: { index: false, follow: false },
  icons: { icon: '/brand/mark-gold.svg' },
};

export default function HoldingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
