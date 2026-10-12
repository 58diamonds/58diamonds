import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from './i18n';

/**
 * Renders the simple Markdown the client types in the admin: paragraphs,
 * "## " and "### " headings, "- " lists, **bold**, *italic* and
 * [links](address). Never raw HTML, so nothing typed can break the page.
 *
 * A link to a bare word (e.g. [returns](returns)) points to that page of the
 * site in the current language.
 */
export function Markdown({ text, locale, vars }: { text: string; locale: Locale; vars?: Record<string, string> }) {
  const filled = vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : text;
  const blocks = filled.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-site">
      {blocks.map((block, i) => {
        if (block.startsWith('### ')) return <h3 key={i}>{inline(block.slice(4), locale)}</h3>;
        if (block.startsWith('## ')) {
          const [head, ...rest] = block.split('\n');
          return (
            <div key={i}>
              <h2>{inline(head.slice(3), locale)}</h2>
              {rest.length > 0 && <Markdown text={rest.join('\n')} locale={locale} />}
            </div>
          );
        }
        const lines = block.split('\n');
        const listStart = lines.findIndex((l) => l.startsWith('- '));
        if (listStart >= 0 && lines.slice(listStart).every((l) => l.startsWith('- '))) {
          return (
            <div key={i}>
              {listStart > 0 && <p>{lines.slice(0, listStart).map((l, j) => line(l, j, locale))}</p>}
              <ul>
                {lines.slice(listStart).map((l, j) => (
                  <li key={j}>{inline(l.slice(2), locale)}</li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={i}>{lines.map((l, j) => line(l, j, locale))}</p>;
      })}
    </div>
  );
}

function line(text: string, j: number, locale: Locale) {
  return (
    <span key={j}>
      {j > 0 && <br />}
      {inline(text, locale)}
    </span>
  );
}

// *italic* needs a word right inside the stars, so the legal "(*)" marks stay as typed.
const TOKEN = /\*\*(.+?)\*\*|\*(?![\s)])(.+?)(?<![\s(])\*(?!\))|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)]+[^\s).,;])/g;

export function inline(text: string, locale: Locale): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = m.index;
    if (m[1]) out.push(<strong key={key}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={key}>{m[2]}</em>);
    else if (m[3]) out.push(<SmartLink key={key} href={m[4]} locale={locale}>{m[3]}</SmartLink>);
    else if (m[5]) out.push(<SmartLink key={key} href={m[5]} locale={locale}>{m[5].replace(/^https?:\/\//, '')}</SmartLink>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function SmartLink({ href, locale, children }: { href: string; locale: Locale; children: ReactNode }) {
  if (/^(https?:|mailto:|tel:)/.test(href)) {
    const external = href.startsWith('http');
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  if (/^javascript:/i.test(href) || href.startsWith('//')) return <>{children}</>;
  const path = href.startsWith('/') ? href : `/${locale}/${href.replace(/^\.?\/?/, '')}`;
  return <Link href={path}>{children}</Link>;
}
