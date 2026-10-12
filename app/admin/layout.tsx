import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { fontVars } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: 'Admin | 58 Diamonds', template: '%s | Admin | 58 Diamonds' },
  robots: { index: false, follow: false },
  icons: { icon: '/brand/mark-gold.svg' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
