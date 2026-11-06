# Automatic WhatsApp messages

The site sends a WhatsApp message to the client at the same moment as these emails:

| Message | When | Template name |
|---|---|---|
| Booking received | A client picks a time in the booking calendar | `58d_booking_received` |
| Booking approved | Farah approves a booking (or moves an approved one) | `58d_booking_confirmed` |
| Booking declined | Farah declines a booking | `58d_booking_declined` |
| Order confirmed | The client has paid at checkout | `58d_order_confirmed` |
| Order shipped | "Send shipped email" on the order in Admin | `58d_order_shipped` |

A message goes out only when **all** of these hold:

1. The WhatsApp account is connected (`WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in Vercel).
2. The message is switched on in Admin > Settings > WhatsApp messages.
3. The client ticked "Also send me updates on WhatsApp" next to their phone number. That box only shows when 1 and 2 are true.

If a message fails, the booking or order goes on as normal: the email has already gone. Failures are in the Vercel logs ("WhatsApp refused").

Code: `lib/whatsapp.ts` (sending), `lib/whatsapp-messages.ts` (the list), migration `supabase/migrations/0016_whatsapp.sql`.

## Setting it up

1. **Choose the number.** Either Farah's current WhatsApp Business number (+32 485 94 09 11), kept in her WhatsApp Business app at the same time ("coexistence": one chat per client, she sees the automatic messages in her app; Meta may refuse some accounts), or a new number used only by the site (suggested: a Belgian prepaid SIM or eSIM, not yet on WhatsApp; after verification it can stay in a drawer, but keep it active with the yearly top-up, because Meta can ask to verify the number again and a cancelled number is given to someone else). With a site-only number, client replies reach the server, not a phone: add a "Message Farah" button to the templates that opens her usual number, or build a WhatsApp inbox in Admin.
2. **Meta Business account** at business.facebook.com, then **business verification** (Settings > Security center) with Farah De Roeck's details, VAT BE0711.864.093.
3. **WhatsApp account**: directly with Meta, no partner needed (pages on business.whatsapp.com push "solution providers"; skip them). At developers.facebook.com/apps register as a developer, Create app, pick the WhatsApp use case, link it to the 58 Diamonds portfolio, then WhatsApp > API Setup > Add phone number (Meta first shows a free test number; that is normal). For coexistence pick "connect your WhatsApp Business app" and scan the QR code with Farah's phone. For a new number, verify it by SMS or call.
4. **Profile**: display name "58 Diamonds" (Meta approves it), the logo as profile photo, the website and address.
5. **Payment method** in WhatsApp Manager > Settings > Payment methods. Meta charges per message (see "Cost" below).
6. **Templates**: in WhatsApp Manager > Message templates, create the five templates below. Category **Utility**, the name exactly as written, one language each for English, Dutch and French. Body as below, footer "58 Diamonds". Meta asks for a sample for each {{n}}: the examples below do.
7. **Token**: in Business Settings > Users > System users, add a system user (Admin), give it the WhatsApp account with full control, and generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`, expiry "Never".
8. **Vercel** (project 58diamonds > Settings > Environment Variables, Production):
   - `WHATSAPP_TOKEN`: the token from step 7
   - `WHATSAPP_PHONE_NUMBER_ID`: in the app's WhatsApp > API setup page, under the number (a long number, not the phone number itself)
   Then redeploy.
9. **Database**: run `supabase/migrations/0016_whatsapp.sql` in the Supabase SQL editor. **Do this before merging the code**, or bookings and settings stop saving.
10. **Merge** the pull request. In Admin > Settings > WhatsApp messages, switch on the messages you want. Test with a booking from your own phone, ticking the WhatsApp box.

## The templates

{{1}} is always the client's name as typed. Dates and times come in the template's language ("Thursday 12 November at 16:00", "donderdag 12 november om 16:00", "jeudi 12 novembre à 16:00").

### 58d_booking_received

Samples: {{1}} Sacha, {{2}} Thursday 12 November at 16:00

- **en**: Hello {{1}}, thank you for your appointment request for {{2}}. Farah will confirm it shortly by email and here on WhatsApp.
- **nl**: Hallo {{1}}, bedankt voor uw afspraakaanvraag voor {{2}}. Farah bevestigt ze binnenkort per e-mail en hier op WhatsApp.
- **fr**: Bonjour {{1}}, merci pour votre demande de rendez-vous le {{2}}. Farah vous la confirmera très bientôt par e-mail et ici sur WhatsApp.

### 58d_booking_confirmed

Samples: {{1}} Sacha, {{2}} Thursday 12 November at 16:00, {{3}} Hoveniersstraat 50, 2018 Antwerp

- **en**: Hello {{1}}, your appointment on {{2}} is confirmed. Address: {{3}}. To cancel, use the link in your confirmation email. We look forward to welcoming you.
- **nl**: Hallo {{1}}, uw afspraak op {{2}} is bevestigd. Adres: {{3}}. Annuleren kan via de link in uw bevestigingsmail. We kijken ernaar uit u te verwelkomen.
- **fr**: Bonjour {{1}}, votre rendez-vous du {{2}} est confirmé. Adresse : {{3}}. Pour annuler, utilisez le lien dans votre e-mail de confirmation. Au plaisir de vous accueillir.

### 58d_booking_declined

Samples: {{1}} Sacha, {{2}} Thursday 12 November at 16:00

- **en**: Hello {{1}}, unfortunately we cannot see you on {{2}}. Please choose another time on our website, or reply to this message.
- **nl**: Hallo {{1}}, helaas kunnen we u niet ontvangen op {{2}}. Kies een ander moment op onze website, of antwoord op dit bericht.
- **fr**: Bonjour {{1}}, malheureusement nous ne pouvons pas vous recevoir le {{2}}. Choisissez un autre moment sur notre site, ou répondez à ce message.

### 58d_order_confirmed

Samples: {{1}} Sacha, {{2}} 1001

- **en**: Hello {{1}}, thank you for your order no. {{2}}. We have received your payment and your invoice is in your email. We will let you know as soon as it ships.
- **nl**: Hallo {{1}}, bedankt voor uw bestelling nr. {{2}}. We hebben uw betaling ontvangen en uw factuur staat in uw e-mail. We laten het u weten zodra ze verzonden is.
- **fr**: Bonjour {{1}}, merci pour votre commande n° {{2}}. Nous avons bien reçu votre paiement et votre facture se trouve dans votre e-mail. Nous vous préviendrons dès son envoi.

### 58d_order_shipped

Samples: {{1}} Sacha, {{2}} 1001, {{3}} DHL 1234567890

{{3}} is the carrier and tracking number, else the tracking link, else the order page.

- **en**: Hello {{1}}, your order no. {{2}} is on its way. Tracking: {{3}}.
- **nl**: Hallo {{1}}, uw bestelling nr. {{2}} is onderweg. Track & trace: {{3}}.
- **fr**: Bonjour {{1}}, votre commande n° {{2}} est en route. Suivi : {{3}}.

## Cost

Meta bills Farah's card directly (WhatsApp Manager > Payment methods); nothing goes through the site. The automatic messages are Utility templates: about EUR 0.0142 each for Belgian numbers ("Rest of Western Europe", rate from 1 October 2026, VAT excluded), more for some countries (France about 0.025, Germany about 0.046), set by the client's number. Since 1 October 2026 sources disagree on whether templates sent within 24 hours of the client writing are still free, so count every message. The "first 1,000 free" a month are service messages (replies typed within 24 hours of the client writing), not these templates. Example: 40 bookings and 10 orders a month, two messages each, about EUR 1.50. No monthly fee from Meta. Other cost: the SIM. Current prices: developers.facebook.com/docs/whatsapp/pricing.

## Changing the wording later

Edit the template in WhatsApp Manager (Meta checks it again). The code only sends the template name and the values, so no code change is needed unless the number or order of {{n}} changes.
