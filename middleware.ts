import { NextResponse, type NextRequest } from 'next/server';
import { SHOP_LIVE, SHOP_PATHS } from './lib/config';
import { isLocale, negotiateLocale } from './lib/i18n';
import { PREVIEW_COOKIE, PREVIEW_PARAM, isSiteHidden, previewToken } from './lib/preview';

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/**
 * Every public address starts with its language (/en, /nl, /fr). An address
 * without one is sent to the visitor's language: the one they picked before
 * (remembered in a cookie), else their browser's, else English.
 *
 * The admin lives on its own address, admin.58diamonds.com: there, /pieces
 * shows the screen built at /admin/pieces. On the public site /admin does not
 * exist.
 *
 * While the shop is hidden (SHOP_LIVE), its addresses answer "not found".
 *
 * While the whole site is hidden (Admin > Settings), every public address shows
 * only the logo, except for people who opened the private preview link.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!SHOP_LIVE && SHOP_PATHS.api.some((p) => under(pathname, p))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (pathname.startsWith('/api')) return NextResponse.next();

  if ((req.headers.get('host') ?? '').startsWith('admin.')) {
    if (under(pathname, '/admin')) return NextResponse.redirect(new URL(pathname.slice('/admin'.length) || '/', req.url));
    const inner = `/admin${pathname === '/' ? '' : pathname}`;
    if (!SHOP_LIVE && SHOP_PATHS.admin.some((p) => under(inner, p))) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.rewrite(new URL(inner, req.url));
  }
  if (await isSiteHidden()) {
    const token = await previewToken();
    const given = req.nextUrl.searchParams.get(PREVIEW_PARAM);
    if (token && given === token) {
      const url = req.nextUrl.clone();
      url.searchParams.delete(PREVIEW_PARAM);
      const res = NextResponse.redirect(url);
      res.cookies.set(PREVIEW_COOKIE, token, { path: '/', maxAge: 60 * 60 * 24 * 60, sameSite: 'lax', httpOnly: true, secure: true });
      return res;
    }
    if (!token || req.cookies.get(PREVIEW_COOKIE)?.value !== token) {
      const res = NextResponse.rewrite(new URL('/holding', req.url));
      res.headers.set('x-robots-tag', 'noindex, nofollow');
      return res;
    }
  }
  if (under(pathname, '/admin')) {
    const remembered = req.cookies.get('locale')?.value;
    return NextResponse.rewrite(new URL(`/${isLocale(remembered) ? remembered : 'en'}/_not-found-shop`, req.url), { status: 404 });
  }

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
