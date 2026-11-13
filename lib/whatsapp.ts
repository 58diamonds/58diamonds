import 'server-only';
import { internationalDigits } from './format';
import type { Locale } from './i18n';
import type { Settings } from './types';
import type { WhatsAppMessage } from './whatsapp-messages';

/**
 * Automatic WhatsApp messages through Meta's WhatsApp Cloud API, with plain
 * fetch so there is no extra package. Like the emails: without
 * WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID nothing is sent, only logged.
 *
 * A message goes out only when all of these hold: the account is connected,
 * the message is switched on in Admin > Settings, the client ticked the
 * WhatsApp box and left a phone number. A failed message never stops the
 * booking or order; the email has already gone.
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';
const PREFIX = process.env.WHATSAPP_TEMPLATE_PREFIX ?? '58d_';

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Whether the site should offer the WhatsApp box: connected and at least one message on. */
export function whatsappOffered(settings: Pick<Settings, 'whatsapp_messages'>): boolean {
  return whatsappConfigured() && Object.values(settings.whatsapp_messages ?? {}).some(Boolean);
}

/**
 * Template parameters: Meta refuses empty ones and ones with new lines, tabs
 * or more than four spaces in a row, so those are folded into one line.
 */
export function cleanParam(v: string | number | null | undefined): string {
  const s = String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return (s || '-').slice(0, 1000);
}

export async function notifyWhatsApp(input: {
  settings: Pick<Settings, 'whatsapp_messages'>;
  message: WhatsAppMessage;
  consent: boolean | null | undefined;
  phone: string | null | undefined;
  locale: Locale;
  params: (string | number | null | undefined)[];
}): Promise<boolean> {
  if (!input.consent || !input.settings.whatsapp_messages?.[input.message]) return false;
  const to = internationalDigits(input.phone);
  if (to.length < 8) return false;
  const template = `${PREFIX}${input.message}`;
  if (!whatsappConfigured()) {
    console.info(`[whatsapp not sent: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing] ${template} -> ${to}`);
    return false;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: input.locale },
          components: [{ type: 'body', parameters: input.params.map((p) => ({ type: 'text', text: cleanParam(p) })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error('WhatsApp refused:', template, res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('WhatsApp failed:', template, e);
    return false;
  }
}
