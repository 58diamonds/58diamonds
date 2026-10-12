/* eslint-disable @next/next/no-img-element */

/**
 * An image, or a quiet placeholder where none has been uploaded yet.
 *
 * Plain <img> rather than next/image: every photo comes from the client's own
 * storage bucket at whatever size they uploaded (the admin already resizes to
 * 2000px), and this keeps the site free of image-domain configuration.
 */
export function Photo({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div className={`photo-placeholder flex items-center justify-center ${className}`} role="img" aria-label={alt}>
        <svg viewBox="0 0 48 48" className="h-10 w-10 text-[var(--color-gold-soft)]" aria-hidden="true">
          <path d="M14 8h20l8 10-18 22L6 18z M6 18h36 M18 8l-4 10 10 22 10-22-4-10" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} loading={eager ? 'eager' : 'lazy'} />;
}
