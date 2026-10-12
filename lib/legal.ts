import type { Page } from './types';

/**
 * Starting wording for the legal pages. They are ordinary pages: Farah edits
 * them in the admin like any other. Words in {braces} are filled in from the
 * settings (company name, address, VAT number, email), so the pages stay right
 * when those change. To be reviewed by Farah's accountant or lawyer before
 * launch.
 */

type LegalPage = Pick<Page, 'slug' | 'title' | 'body'>;

const terms: LegalPage = {
  slug: 'terms',
  title: { en: 'Terms of sale', nl: 'Verkoopsvoorwaarden', fr: 'Conditions de vente' },
  body: {
    en: `## Who we are
This shop is run by {company_name}, {company_address}, VAT {vat_number}. You can reach us at {email}.

## Prices
All prices are in euro and include Belgian VAT. Shipping costs are shown in your bag before you pay.

## Orders and payment
Your order is confirmed once the payment is received. We accept card, Bancontact, iDEAL, Apple Pay, Google Pay and PayPal. You receive a confirmation email and an invoice, which you can also download from your account.

## Delivery
Every order ships insured, with tracking. See [Shipping and returns](returns) for times and countries.

## Right of withdrawal
You may return a piece within 14 days of receiving it, without giving a reason, as described in [Shipping and returns](returns). This right does not apply to pieces made to measure or personalised for you (bespoke pieces, engraving, resizing on request).

## Guarantee
Every piece carries the legal two-year guarantee against defects. Normal wear, knocks and loss of stones caused by impact are not covered.

## Disputes
Belgian law applies. If we cannot find a solution together, you can turn to the European online dispute resolution platform: https://ec.europa.eu/consumers/odr.`,
    nl: `## Wie zijn we
Deze winkel wordt uitgebaat door {company_name}, {company_address}, btw {vat_number}. U bereikt ons via {email}.

## Prijzen
Alle prijzen zijn in euro en inclusief Belgische btw. De verzendkosten ziet u in uw winkeltas voor u betaalt.

## Bestellen en betalen
Uw bestelling is bevestigd zodra de betaling ontvangen is. We aanvaarden kaart, Bancontact, iDEAL, Apple Pay, Google Pay en PayPal. U ontvangt een bevestiging per e-mail en een factuur, die u ook in uw account kunt downloaden.

## Levering
Elke bestelling wordt verzekerd en met track & trace verzonden. Zie [Verzending en retour](returns) voor termijnen en landen.

## Herroepingsrecht
U mag een juweel binnen 14 dagen na ontvangst terugsturen zonder reden op te geven, zoals beschreven in [Verzending en retour](returns). Dit recht geldt niet voor juwelen die op maat of gepersonaliseerd voor u gemaakt zijn (juwelen op maat, gravure, aanpassing van maat op vraag).

## Garantie
Elk juweel heeft de wettelijke garantie van twee jaar op gebreken. Normale slijtage, stoten en verlies van stenen door een schok vallen er niet onder.

## Geschillen
Het Belgisch recht is van toepassing. Vinden we samen geen oplossing, dan kunt u terecht bij het Europese platform voor onlinegeschillenbeslechting: https://ec.europa.eu/consumers/odr.`,
    fr: `## Qui sommes-nous
Cette boutique est exploitée par {company_name}, {company_address}, TVA {vat_number}. Vous pouvez nous joindre à {email}.

## Prix
Tous les prix sont en euros, TVA belge comprise. Les frais de livraison sont indiqués dans votre panier avant le paiement.

## Commande et paiement
Votre commande est confirmée dès réception du paiement. Nous acceptons la carte, Bancontact, iDEAL, Apple Pay, Google Pay et PayPal. Vous recevez une confirmation par e-mail et une facture, également disponible dans votre compte.

## Livraison
Chaque commande est expédiée assurée, avec suivi. Voir [Livraison et retours](returns) pour les délais et les pays.

## Droit de rétractation
Vous pouvez retourner un bijou dans les 14 jours suivant sa réception, sans motif, comme décrit dans [Livraison et retours](returns). Ce droit ne s'applique pas aux bijoux faits sur mesure ou personnalisés pour vous (créations sur mesure, gravure, mise à taille sur demande).

## Garantie
Chaque bijou bénéficie de la garantie légale de deux ans contre les défauts. L'usure normale, les chocs et la perte de pierres due à un choc ne sont pas couverts.

## Litiges
Le droit belge s'applique. Si nous ne trouvons pas de solution ensemble, vous pouvez vous adresser à la plateforme européenne de règlement en ligne des litiges : https://ec.europa.eu/consumers/odr.`,
  },
};

const returns: LegalPage = {
  slug: 'returns',
  title: { en: 'Shipping and returns', nl: 'Verzending en retour', fr: 'Livraison et retours' },
  body: {
    en: `## Shipping
Pieces in stock leave within 2 working days. Every parcel is insured for its full value and needs a signature on delivery. As soon as it leaves, you receive an email with the tracking link, which you also find in your account.

## Returns
You have 14 days from delivery to change your mind. Write to {email} with your order number, and we will send you the return instructions. The piece must come back unworn, in its original packaging, with its certificate. Return shipping must be insured; its cost is yours unless the piece is defective.

We refund the full amount, including the original standard shipping, within 14 days of receiving the piece back, with the payment method you used.

## Bespoke pieces
Pieces made to measure or personalised for you cannot be returned, except for a defect.`,
    nl: `## Verzending
Juwelen in voorraad vertrekken binnen 2 werkdagen. Elk pakket is verzekerd voor de volle waarde en wordt tegen handtekening geleverd. Zodra het vertrekt, ontvangt u een e-mail met de track & trace-link, die u ook in uw account vindt.

## Retour
U hebt 14 dagen na levering om van gedachten te veranderen. Schrijf naar {email} met uw bestelnummer en we sturen u de instructies. Het juweel moet ongedragen terugkomen, in de originele verpakking, met het certificaat. De terugzending moet verzekerd zijn; de kosten zijn voor u, behalve bij een gebrek.

We betalen het volledige bedrag terug, inclusief de oorspronkelijke standaardverzending, binnen 14 dagen na ontvangst van het juweel, via de betaalmethode die u gebruikte.

## Juwelen op maat
Juwelen die op maat of gepersonaliseerd voor u gemaakt zijn, kunnen niet teruggestuurd worden, behalve bij een gebrek.`,
    fr: `## Livraison
Les bijoux en stock partent sous 2 jours ouvrables. Chaque colis est assuré pour sa pleine valeur et remis contre signature. Dès son départ, vous recevez un e-mail avec le lien de suivi, que vous retrouvez aussi dans votre compte.

## Retours
Vous disposez de 14 jours après la livraison pour changer d'avis. Écrivez à {email} avec votre numéro de commande et nous vous enverrons les instructions. Le bijou doit revenir non porté, dans son emballage d'origine, avec son certificat. Le renvoi doit être assuré ; ses frais sont à votre charge, sauf en cas de défaut.

Nous remboursons le montant total, y compris la livraison standard d'origine, dans les 14 jours suivant la réception du bijou, par le moyen de paiement utilisé.

## Créations sur mesure
Les bijoux faits sur mesure ou personnalisés pour vous ne peuvent pas être retournés, sauf en cas de défaut.`,
  },
};

const privacy: LegalPage = {
  slug: 'privacy',
  title: { en: 'Privacy', nl: 'Privacy', fr: 'Confidentialité' },
  body: {
    en: `## Who is responsible
{company_name}, {company_address}, VAT {vat_number}, {email}.

## What we keep and why
- Your name, email, phone and address, to deliver your order, send your invoice and answer your requests.
- Your orders and invoices, which the law requires us to keep for 7 years.
- Your email for the newsletter, only if you subscribe. Every newsletter has a link to unsubscribe.

## Who else sees it
Only the companies that help us serve you: Stripe for payments, our carrier for delivery, our hosting and email providers. We never sell your data.

## Your rights
You can ask to see, correct or delete your data at {email}. You can also file a complaint with the Belgian Data Protection Authority (www.dataprotectionauthority.be).`,
    nl: `## Wie is verantwoordelijk
{company_name}, {company_address}, btw {vat_number}, {email}.

## Wat we bewaren en waarom
- Uw naam, e-mail, telefoon en adres, om uw bestelling te leveren, uw factuur te sturen en uw vragen te beantwoorden.
- Uw bestellingen en facturen, die we wettelijk 7 jaar moeten bewaren.
- Uw e-mail voor de nieuwsbrief, enkel als u zich inschrijft. Elke nieuwsbrief heeft een link om u uit te schrijven.

## Wie het nog ziet
Enkel de bedrijven die ons helpen u te bedienen: Stripe voor betalingen, onze vervoerder voor de levering, onze hosting- en e-mailleveranciers. We verkopen uw gegevens nooit.

## Uw rechten
U kunt uw gegevens inkijken, laten verbeteren of wissen via {email}. U kunt ook klacht indienen bij de Gegevensbeschermingsautoriteit (www.gegevensbeschermingsautoriteit.be).`,
    fr: `## Responsable
{company_name}, {company_address}, TVA {vat_number}, {email}.

## Ce que nous conservons et pourquoi
- Vos nom, e-mail, téléphone et adresse, pour livrer votre commande, envoyer votre facture et répondre à vos demandes.
- Vos commandes et factures, que la loi nous impose de conserver 7 ans.
- Votre e-mail pour la newsletter, uniquement si vous vous inscrivez. Chaque envoi contient un lien de désinscription.

## Qui d'autre y a accès
Uniquement les sociétés qui nous aident à vous servir : Stripe pour les paiements, notre transporteur pour la livraison, nos fournisseurs d'hébergement et d'e-mail. Nous ne vendons jamais vos données.

## Vos droits
Vous pouvez consulter, corriger ou supprimer vos données en écrivant à {email}. Vous pouvez aussi introduire une plainte auprès de l'Autorité de protection des données (www.autoriteprotectiondonnees.be).`,
  },
};

const cookies: LegalPage = {
  slug: 'cookies',
  title: { en: 'Cookies', nl: 'Cookies', fr: 'Cookies' },
  body: {
    en: `This site only uses what it needs to work:
- your bag and wishlist, kept in your browser;
- your login, if you have an account;
- your language choice.

We use no advertising or tracking cookies, so there is nothing to accept. Payments happen on Stripe's secure page, which has its own [cookie policy](https://stripe.com/cookies-policy/legal).`,
    nl: `Deze site gebruikt enkel wat nodig is om te werken:
- uw winkeltas en verlanglijst, bewaard in uw browser;
- uw login, als u een account hebt;
- uw taalkeuze.

We gebruiken geen advertentie- of trackingcookies, dus er valt niets te aanvaarden. Betalingen gebeuren op de beveiligde pagina van Stripe, met een eigen [cookiebeleid](https://stripe.com/cookies-policy/legal).`,
    fr: `Ce site utilise uniquement ce qui est nécessaire à son fonctionnement :
- votre panier et votre liste de souhaits, conservés dans votre navigateur ;
- votre connexion, si vous avez un compte ;
- votre choix de langue.

Nous n'utilisons aucun cookie publicitaire ou de suivi, il n'y a donc rien à accepter. Les paiements se font sur la page sécurisée de Stripe, qui a sa propre [politique de cookies](https://stripe.com/cookies-policy/legal).`,
  },
};

export const LEGAL_PAGES: LegalPage[] = [terms, returns, privacy, cookies];
