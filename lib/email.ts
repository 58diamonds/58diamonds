import 'server-only';

/**
 * Sends email through Resend (resend.com), with plain fetch so there is no
 * extra package. Without RESEND_API_KEY nothing is sent and the email is only
 * logged, so a preview never fails on email.
 */
export interface Mail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  attachments?: { filename: string; content: Uint8Array }[];
}

export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || '58 Diamonds <orders@58diamonds.com>';
  if (!key) {
    console.info(`[email not sent: RESEND_API_KEY missing] ${mail.subject} -> ${mail.to}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      reply_to: mail.replyTo || undefined,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })),
    }),
  }).catch((e: unknown) => {
    console.error('Email failed:', e);
    return null;
  });
  if (!res?.ok) {
    console.error('Email refused:', res?.status, await res?.text().catch(() => ''));
    return false;
  }
  return true;
}

/** Where shop notifications go: the address in settings, else ADMIN_EMAIL. */
export function adminAddress(settingsEmail: string | null | undefined): string | null {
  return settingsEmail || process.env.ADMIN_EMAIL || null;
}
