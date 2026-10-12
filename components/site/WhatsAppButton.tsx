import { whatsappLink } from '@/lib/format';
import { WhatsAppIcon } from './icons';

/** The floating WhatsApp button on every public page. Hidden until a number is set in the admin. */
export function WhatsAppButton({ number, label, message }: { number: string | null; label: string; message: string }) {
  const link = whatsappLink(number, message);
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/15 transition hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
