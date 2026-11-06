/**
 * The automatic WhatsApp messages, for the admin switches and the sender.
 * Each one is a template approved by Meta, named `58d_<key>` and made in
 * English (en), Dutch (nl) and French (fr). The wording to submit is in
 * docs/whatsapp.md; `params` lists what fills {{1}}, {{2}}, ... in order.
 */
export const WHATSAPP_MESSAGES = [
  { key: 'booking_received', label: 'Booking received', hint: 'Right after a client picks a time in the booking calendar.', params: ['name', 'when'] },
  { key: 'booking_confirmed', label: 'Booking approved', hint: 'When you approve a booking, or move an approved one.', params: ['name', 'when', 'address'] },
  { key: 'booking_declined', label: 'Booking declined', hint: 'When you decline a booking.', params: ['name', 'when'] },
  { key: 'order_confirmed', label: 'Order confirmed', hint: 'After the client has paid at checkout.', params: ['name', 'order number'] },
  { key: 'order_shipped', label: 'Order shipped', hint: 'When you send the shipped email from the order.', params: ['name', 'order number', 'tracking'] },
] as const;

export type WhatsAppMessage = (typeof WHATSAPP_MESSAGES)[number]['key'];

/** Any message switched on in the admin. */
export function anyWhatsAppOn(switches: Record<string, boolean> | null | undefined): boolean {
  return Object.values(switches ?? {}).some(Boolean);
}
