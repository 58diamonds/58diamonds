import { describe, expect, it } from 'vitest';
import { brusselsDay, clientIp, isCountable, visitorId } from './visitors';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

describe('unique visitors', () => {
  it('counts a browser, not bots, link previews or prefetches', () => {
    expect(isCountable(new Headers({ 'user-agent': CHROME }))).toBe(true);
    expect(isCountable(new Headers({}))).toBe(false);
    expect(isCountable(new Headers({ 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }))).toBe(false);
    expect(isCountable(new Headers({ 'user-agent': 'WhatsApp/2.23.20.0' }))).toBe(false);
    expect(isCountable(new Headers({ 'user-agent': 'facebookexternalhit/1.1' }))).toBe(false);
    expect(isCountable(new Headers({ 'user-agent': CHROME, 'sec-purpose': 'prefetch' }))).toBe(false);
    expect(isCountable(new Headers({ 'user-agent': CHROME, rsc: '1' }))).toBe(false);
  });

  it('reads the IP address Vercel passes on', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '81.82.83.84' }))).toBe('81.82.83.84');
    expect(clientIp(new Headers({ 'x-forwarded-for': '81.82.83.84, 10.0.0.1' }))).toBe('81.82.83.84');
    expect(clientIp(new Headers({}))).toBe('');
  });

  it('uses the Antwerp date', () => {
    expect(brusselsDay(new Date('2026-11-27T22:30:00Z'))).toBe('2026-11-27');
    expect(brusselsDay(new Date('2026-11-27T23:30:00Z'))).toBe('2026-11-28');
  });

  it('turns IP + browser into a code that does not contain the IP', async () => {
    const a = await visitorId('secret', '81.82.83.84', CHROME);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(await visitorId('secret', '81.82.83.84', CHROME)).toBe(a);
    expect(await visitorId('secret', '81.82.83.85', CHROME)).not.toBe(a);
    expect(await visitorId('other', '81.82.83.84', CHROME)).not.toBe(a);
  });
});
