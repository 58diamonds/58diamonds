import 'server-only';

/**
 * Translation of the admin's text between English, Dutch and French, with DeepL
 * (deepl.com/pro-api). The free "Developer" plan comes with a one-time
 * credit of 1 million characters. Without DEEPL_API_KEY the admin says
 * translation is not set up.
 */

export type Lang = 'en' | 'nl' | 'fr';

export const TRANSLATION_READY = Boolean(process.env.DEEPL_API_KEY);

export async function translate(text: string, from: Lang, to: Lang): Promise<string> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error('Translation is not set up yet.');
  const body = JSON.stringify({
    text: [protect(text)],
    source_lang: from.toUpperCase(),
    // DeepL wants a variant for English; the site writes British English.
    target_lang: to === 'en' ? 'EN-GB' : to.toUpperCase(),
    // Clients are addressed with "u" and "vous" (ignored for English).
    formality: 'prefer_more',
    preserve_formatting: true,
    tag_handling: 'xml',
    ignore_tags: ['k'],
  });
  // Free keys have used their own host (keys ending in ":fx"); a key sent to
  // the wrong one is refused with 403, so the other host is tried once.
  const hosts = key.endsWith(':fx') ? ['https://api-free.deepl.com', 'https://api.deepl.com'] : ['https://api.deepl.com', 'https://api-free.deepl.com'];
  const call = (host: string) =>
    fetch(`${host}/v2/translate`, { method: 'POST', headers: { authorization: `DeepL-Auth-Key ${key}`, 'content-type': 'application/json' }, body });
  let res = await call(hosts[0]);
  if (res.status === 403) res = await call(hosts[1]);
  if (!res.ok) throw new Error(res.status === 456 ? 'The translation allowance is used up.' : `Translation failed (${res.status}).`);
  const json = (await res.json()) as { translations?: { text: string }[] };
  return restore(json.translations?.[0]?.text ?? '');
}

/** Placeholders such as {n} or {company_name} must come back untouched. */
function protect(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{[a-z_]+\}/g, (m) => `<k>${m}</k>`);
}

function restore(text: string): string {
  return text
    .replace(/<\/?k>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
