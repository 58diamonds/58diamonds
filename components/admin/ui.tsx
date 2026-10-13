'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { translateText, uploadFile, uploadImage } from '@/lib/admin-client';
import { slugify } from '@/lib/format';
import { LOCALES, LOCALE_NAMES, type L10n, type Locale } from '@/lib/i18n';
import { askConfirm } from './confirm';

/**
 * The admin's building blocks, in the website's own ivory look and fonts, so
 * Farah works in the same look as her site.
 */

export const inputCls =
  'mt-1 w-full rounded-none border border-[var(--color-line)] bg-[var(--color-ivory)] px-3 py-2.5 text-[0.95rem] outline-none transition focus:border-[var(--color-gold)]';

export function PageTitle({ title, back, children }: { title: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="eyebrow hover:text-[var(--color-ink)]">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--color-stone)]">{children}</p>;
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-[var(--color-line)] bg-white p-5 sm:p-6 ${className}`}>
      {title && <h2 className="font-display mb-4 text-2xl">{title}</h2>}
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
  placeholder,
  type = 'text',
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: string;
  hint?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      {multiline ? (
        <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
      {hint && <span className="mt-1 block text-xs text-[var(--color-stone)]">{hint}</span>}
    </label>
  );
}

export function NumberField({ label, value, onChange, hint, step = 1, min = 0 }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string; step?: number; min?: number }) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputCls}
      />
      {hint && <span className="mt-1 block text-xs text-[var(--color-stone)]">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-[var(--color-stone)]">{hint}</span>}
    </label>
  );
}

/**
 * One text in the three languages, with a tab per language. A dot on a tab
 * means that language is filled in; an empty language shows the English.
 */
export function L10nField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 5,
  hint,
}: {
  label: string;
  value: L10n;
  onChange: (v: L10n) => void;
  multiline?: boolean;
  rows?: number;
  hint?: React.ReactNode;
}) {
  const [lang, setLang] = useState<Locale>('en');
  const v = value ?? {};
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm">{label}</span>
        <TranslateButton value={v} from={lang} onChange={onChange} className="ml-auto" />
        <div className="flex" role="tablist" aria-label={`${label}: language`}>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              title={LOCALE_NAMES[l]}
              onClick={() => setLang(l)}
              className={`relative px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] ${lang === l ? 'bg-[var(--color-ink)] text-[var(--color-ivory)]' : 'text-[var(--color-stone)] hover:text-[var(--color-ink)]'}`}
            >
              {l}
              {v[l]?.trim() && <span className={`absolute right-0.5 top-0.5 h-1 w-1 rounded-full ${lang === l ? 'bg-[var(--color-foil)]' : 'bg-[var(--color-gold)]'}`} />}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          lang={lang}
          rows={rows}
          value={v[lang] ?? ''}
          placeholder={lang !== 'en' ? v.en ?? '' : ''}
          onChange={(e) => onChange({ ...v, [lang]: e.target.value })}
          className={`${inputCls} resize-y`}
        />
      ) : (
        <input
          lang={lang}
          value={v[lang] ?? ''}
          placeholder={lang !== 'en' ? v.en ?? '' : ''}
          onChange={(e) => onChange({ ...v, [lang]: e.target.value })}
          className={inputCls}
        />
      )}
      {hint && <span className="mt-1 block text-xs text-[var(--color-stone)]">{hint}</span>}
    </div>
  );
}

const LANGUAGE: Record<Locale, string> = { en: 'English', nl: 'Dutch', fr: 'French' };

/**
 * Fills the other two languages from the one Farah wrote in. The result lands
 * in the normal boxes, so it can be corrected before saving.
 */
export function TranslateButton({ value, from, onChange, className = '' }: { value: L10n; from: Locale; onChange: (v: L10n) => void; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const text = value[from]?.trim();
  if (!text) return null;
  const others = LOCALES.filter((l) => l !== from);
  async function go() {
    const filled = others.filter((l) => value[l]?.trim());
    if (filled.length && !(await askConfirm(`Replace the ${filled.map((l) => LANGUAGE[l]).join(' and ')} with a new translation of the ${LANGUAGE[from]}?`))) return;
    setBusy(true);
    setError('');
    try {
      onChange({ ...value, ...(await translateText(text!, from)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed.');
    }
    setBusy(false);
  }
  return (
    <span className={`text-xs ${className}`}>
      {error && <span className="mr-2 text-red-800">{error}</span>}
      <button type="button" onClick={go} disabled={busy} className="underline underline-offset-2 hover:text-[var(--color-gold)] disabled:opacity-50">
        {busy ? 'Translating...' : `Translate from ${LANGUAGE[from]}`}
      </button>
    </span>
  );
}

/**
 * The web address of a piece, page or event. While `auto` is on it is made
 * from the name; "Change" lets Farah type her own.
 */
export function AddressField({
  prefix,
  slug,
  auto,
  onChange,
  onAuto,
}: {
  prefix: string;
  slug: string;
  auto: boolean;
  onChange: (v: string) => void;
  onAuto: (on: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm">Web address</span>
        <button type="button" onClick={() => onAuto(!auto)} className="text-xs underline underline-offset-2 hover:text-[var(--color-gold)]">
          {auto ? 'Change' : 'Make it from the name'}
        </button>
      </div>
      {auto ? (
        <p className="mt-1 break-all border border-transparent py-2.5 text-[0.95rem]">
          {prefix}
          {slug || '...'}
        </p>
      ) : (
        <input value={slug} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
      <span className="mt-1 block text-xs text-[var(--color-stone)]">
        {auto ? 'Made from the English name. A number is added if another one already has it.' : `${prefix}${slugify(slug) || '...'}`}
      </span>
    </div>
  );
}

export const MARKDOWN_HINT = 'Blank line = new paragraph. "## " starts a heading, "- " a list item. **bold**, *italic*, [link text](https://...).';

/** An on/off switch with its meaning spelled out next to it. */
export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-line)]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </button>
      <button type="button" onClick={() => onChange(!checked)} className="text-left">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-[var(--color-stone)]">{hint}</span>}
      </button>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  tone = 'quiet',
  label,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'quiet' | 'danger' | 'dark' | 'gold';
  label?: string;
  type?: 'button' | 'submit';
}) {
  const tones = {
    quiet: 'border-[var(--color-line)] bg-white hover:border-[var(--color-ink)]',
    danger: 'border-red-200 bg-white text-red-800 hover:bg-red-50',
    dark: 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-ivory)] hover:bg-[#4a3f37]',
    gold: 'border-[var(--color-gold)] bg-[var(--color-gold)] text-white hover:opacity-90',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-2 border px-4 text-[0.72rem] uppercase tracking-[0.14em] transition disabled:opacity-30 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/** Move up / move down, the ordering control used everywhere. */
export function UpDown({ index, count, onMove }: { index: number; count: number; onMove: (delta: -1 | 1) => void }) {
  const btn = 'flex h-8 w-8 items-center justify-center border border-[var(--color-line)] bg-white text-sm hover:border-[var(--color-ink)] disabled:opacity-25';
  return (
    <span className="inline-flex gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up" title="Move up">
        ↑
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move down" title="Move down">
        ↓
      </button>
    </span>
  );
}

/** Pick a photo, see it, replace or remove it. Uploads straight to storage. */
export function ImageField({
  label,
  value,
  onChange,
  folder,
  aspect = 'aspect-[4/5]',
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  aspect?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <span className="text-sm">{label}</span>
      <div className={`mt-1 w-40 overflow-hidden border border-[var(--color-line)] bg-[var(--color-pearl)] ${aspect}`}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[var(--color-stone)]">No photo</div>}
      </div>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading...' : value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <Button onClick={() => onChange(null)} tone="danger">
            Remove
          </Button>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-[var(--color-stone)]">{hint}</span>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="mt-1 text-xs text-red-800">{error}</p>}
    </div>
  );
}

/** Upload any file (a PDF of an article); shows a link to the current one. */
export function FileField({ label, value, onChange, folder, accept = 'application/pdf,image/*' }: { label: string; value: string | null; onChange: (url: string | null) => void; folder: string; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <span className="text-sm">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="mr-2 text-sm underline underline-offset-4">
            Open current file
          </a>
        )}
        <Button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading...' : value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <Button tone="danger" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            onChange(await uploadFile(file, folder));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.');
          }
          setBusy(false);
        }}
      />
      {error && <p className="mt-1 text-xs text-red-800">{error}</p>}
    </div>
  );
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | { error: string };

/** A small "Saved" / error line next to a save button. */
export function SaveState({ state }: { state: SaveStatus }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <span className="text-sm text-[var(--color-stone)]">Saving...</span>;
  if (state === 'saved') return <span className="text-sm text-[var(--color-gold)]">Saved. It is on the site now.</span>;
  return <span className="text-sm text-red-800">{state.error}</span>;
}

/** Back to the screen before, or to `fallback` when the page was opened directly. */
export function useGoBack(fallback = '/') {
  const router = useRouter();
  return () => (window.history.length > 1 ? router.back() : router.push(fallback));
}

/**
 * The save bar at the bottom of an edit page; it stays in view while
 * scrolling. Cancel leaves without saving, back to the screen before.
 * Delete is never in this bar: put a DeleteZone at the end of the page.
 */
export function SaveBar({ state, onSave, onCancel, back = '/' }: { state: SaveStatus; onSave: () => void; onCancel?: () => void; back?: string }) {
  const goBack = useGoBack(back);
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] bg-[var(--color-ivory)]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      <Button tone="dark" onClick={onSave} disabled={state === 'saving'}>
        Save
      </Button>
      <Button onClick={onCancel ?? goBack}>Cancel</Button>
      <SaveState state={state} />
    </div>
  );
}

/** Save and Cancel under a form on a list page, with Delete set well apart. */
export function FormActions({
  state,
  onSave,
  onCancel,
  onDelete,
  deleteLabel = 'Delete',
  saveDisabled,
}: {
  state?: SaveStatus;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  saveDisabled?: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button tone="dark" onClick={onSave} disabled={saveDisabled || state === 'saving'}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        {state && <SaveState state={state} />}
      </div>
      {onDelete && (
        <div className="mt-10 border-t border-[var(--color-line)] pt-5">
          <Button tone="danger" onClick={onDelete}>
            {deleteLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Delete, at the very end of an edit page, away from Save and Cancel. */
export function DeleteZone({ label, onDelete, hint }: { label: string; onDelete: () => void; hint?: string }) {
  return (
    <div className="mt-16 border-t border-[var(--color-line)] pt-6">
      {hint && <p className="mb-3 text-sm text-[var(--color-stone)]">{hint}</p>}
      <Button tone="danger" onClick={onDelete}>
        {label}
      </Button>
    </div>
  );
}

export function Badge({ children, tone = 'quiet' }: { children: React.ReactNode; tone?: 'quiet' | 'gold' | 'warn' | 'dark' }) {
  const tones = {
    quiet: 'bg-[var(--color-pearl)] text-[var(--color-stone)]',
    gold: 'bg-[#f3ead9] text-[#7a5c2e]',
    warn: 'bg-amber-100 text-amber-900',
    dark: 'bg-[var(--color-ink)] text-[var(--color-ivory)]',
  };
  return <span className={`inline-block px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}

export function Loading() {
  return <p className="text-sm text-[var(--color-stone)]">Loading...</p>;
}

/** First filled language of a text, for lists. */
export function show(v: L10n | null | undefined): string {
  return v?.en?.trim() || v?.nl?.trim() || v?.fr?.trim() || '';
}

/** Run a save, show its state, publish the change to the site. */
export function useSave() {
  const [state, setState] = useState<SaveStatus>('idle');
  async function run(fn: () => Promise<{ error: { message: string } | null } | void>) {
    setState('saving');
    try {
      const res = await fn();
      if (res && res.error) {
        setState({ error: friendlyError(res.error.message) });
        return false;
      }
      const { publish } = await import('@/lib/admin-client');
      await publish();
      setState('saved');
      setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 3000);
      return true;
    } catch (e) {
      setState({ error: friendlyError(e instanceof Error ? e.message : String(e)) });
      return false;
    }
  }
  return { state, run, setState };
}

function friendlyError(message: string): string {
  if (/duplicate key.*slug/i.test(message)) return 'That web address is already used by something else. Choose another.';
  if (/slug_check|check constraint.*slug/i.test(message)) return 'The web address may only use lowercase letters, numbers and hyphens.';
  if (/row-level security|permission denied/i.test(message)) return 'Not allowed. Sign out and in again.';
  return message;
}
