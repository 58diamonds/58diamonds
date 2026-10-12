import { NextResponse, type NextRequest } from 'next/server';
import { SHOP_LIVE, SHOP_PATHS } from './lib/config';
import { isLocale, negotiateLocale } from './lib/i18n';

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/**
 * Every public address starts with its language (/en, /nl, /fr). An address
 * without one is sent to the visitor's language: the one they picked before
 * (remembered in a cookie), else their browser's, else English.
 *
 * While the shop is hidden (SHOP_LIVE), its addresses answer "not found".
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!SHOP_LIVE) {
    if (SHOP_PATHS.api.some((p) => under(pathname, p))) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (SHOP_PATHS.admin.some((p) => under(pathname, p))) return NextResponse.redirect(new URL('/admin', req.url));
  }
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return NextResponse.next();

  const [, first, second] = pathname.split('/');
  if (isLocale(first)) {
    if (!SHOP_LIVE && SHOP_PATHS.site.includes(second)) {
      // Any address the site does not have shows the language's own "not found" page.
      return NextResponse.rewrite(new URL(`/${first}/_not-found-shop`, req.url), { status: 404 });
    }
    const res = NextResponse.next();
    if (req.cookies.get('locale')?.value !== first) {
      res.cookies.set('locale', first, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    }
    return res;
  }
  const remembered = req.cookies.get('locale')?.value;
  const locale = isLocale(remembered) ? remembered : negotiateLocale(req.headers.get('accept-language'));
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Not Next's own files or anything with a file extension.
  matcher: ['/((?!_next|.*\\..*).*)'],
};
