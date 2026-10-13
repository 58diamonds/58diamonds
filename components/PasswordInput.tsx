'use client';

import { useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { showLabel?: string; hideLabel?: string };

/** A password field with a small eye to show or hide what is typed. */
export function PasswordInput({ className = '', showLabel = 'Show password', hideLabel = 'Hide password', ...props }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${className} !pr-11`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? hideLabel : showLabel}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--color-stone)] hover:text-[var(--color-ink)]"
      >
        <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  );
}
