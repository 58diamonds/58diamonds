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
This shop is run by {company_name} (a trade name of {legal_name}, sole trader), {company_address}, VAT {vat_number}. You can reach us at {email}.

## Prices
All prices are in euro and include VAT: Belgian VAT, or the VAT of your EU country where the law requires it. Orders shipped outside the EU are exports, without EU VAT. Shipping costs are shown in your bag before you pay.

## Orders and payment
Your order is confirmed once the payment is received. We accept card, Bancontact, iDEAL, Apple Pay, Google Pay and PayPal. You receive a confirmation email and an invoice, which you can also download from your account.

## Delivery
Every order ships insured, with tracking. See [Shipping and returns](returns) for times and countries.

## Right of withdrawal
You may return a piece within 14 days of receiving it, without giving a reason, as described in [Shipping and returns](returns), for example with the model withdrawal form at the end of these terms. This right does not apply to pieces made to measure or personalised for you (bespoke pieces, engraving, resizing on request).

## Guarantee
Every piece carries the legal two-year guarantee against defects. Normal wear, knocks and loss of stones caused by impact are not covered.

## Disputes
Belgian law applies. If we cannot find a solution together, you can turn free of charge to the Consumer Mediation Service (Consumentenombudsdienst / Service de Médiation pour le Consommateur): https://consumentenombudsdienst.be.`,
    nl: `## Wie zijn we
Deze winkel wordt uitgebaat door {company_name} (handelsnaam van {legal_name}, eenmanszaak), {company_address}, btw {vat_number}. U bereikt ons via {email}.

## Prijzen
Alle prijzen zijn in euro en inclusief btw: Belgische btw, of de btw van uw EU-land waar de wet dat vereist. Bestellingen buiten de EU zijn uitvoer, zonder Europese btw. De verzendkosten ziet u in uw winkeltas voor u betaalt.

## Bestellen en betalen
Uw bestelling is bevestigd zodra de betaling ontvangen is. We aanvaarden kaart, Bancontact, iDEAL, Apple Pay, Google Pay en PayPal. U ontvangt een bevestiging per e-mail en een factuur, die u ook in uw account kunt downloaden.

## Levering
Elke bestelling wordt verzekerd en met track & trace verzonden. Zie [Verzending en retour](returns) voor termijnen en landen.

## Herroepingsrecht
U mag een juweel binnen 14 dagen na ontvangst terugsturen zonder reden op te geven, zoals beschreven in [Verzending en retour](returns), bijvoorbeeld met het modelformulier voor herroeping onderaan deze voorwaarden. Dit recht geldt niet voor juwelen die op maat of gepersonaliseerd voor u gemaakt zijn (juwelen op maat, gravure, aanpassing van maat op vraag).

## Garantie
Elk juweel heeft de wettelijke garantie van twee jaar op gebreken. Normale slijtage, stoten en verlies van stenen door een schok vallen er niet onder.

## Geschillen
Het Belgisch recht is van toepassing. Vinden we samen geen oplossing, dan kunt u gratis terecht bij de Consumentenombudsdienst: https://consumentenombudsdienst.be.`,
    fr: `## Qui sommes-nous
Cette boutique est exploitée par {company_name} (nom commercial de {legal_name}, entreprise individuelle), {company_address}, TVA {vat_number}. Vous pouvez nous joindre à {email}.

## Prix
Tous les prix sont en euros, TVA comprise : TVA belge, ou TVA de votre pays de l'UE lorsque la loi l'exige. Les commandes livrées hors de l'UE sont des exportations, sans TVA européenne. Les frais de livraison sont indiqués dans votre panier avant le paiement.

## Commande et paiement
Votre commande est confirmée dès réception du paiement. Nous acceptons la carte, Bancontact, iDEAL, Apple Pay, Google Pay et PayPal. Vous recevez une confirmation par e-mail et une facture, également disponible dans votre compte.

## Livraison
Chaque commande est expédiée assurée, avec suivi. Voir [Livraison et retours](returns) pour les délais et les pays.

## Droit de rétractation
Vous pouvez retourner un bijou dans les 14 jours suivant sa réception, sans motif, comme décrit dans [Livraison et retours](returns), par exemple avec le formulaire de rétractation à la fin de ces conditions. Ce droit ne s'applique pas aux bijoux faits sur mesure ou personnalisés pour vous (créations sur mesure, gravure, mise à taille sur demande).

## Garantie
Chaque bijou bénéficie de la garantie légale de deux ans contre les défauts. L'usure normale, les chocs et la perte de pierres due à un choc ne sont pas couverts.

## Litiges
Le droit belge s'applique. Si nous ne trouvons pas de solution ensemble, vous pouvez vous adresser gratuitement au Service de Médiation pour le Consommateur : https://mediationconsommateur.be.`,
  },
};

const returns: LegalPage = {
  slug: 'returns',
  title: { en: 'Shipping and returns', nl: 'Verzending en retour', fr: 'Livraison et retours' },
  body: {
    en: `## Shipping
Pieces in stock leave within 2 working days. Every parcel is insured for its full value and needs a signature on delivery. As soon as it leaves, you receive an email with the tracking link, which you also find in your account.

## Your right of withdrawal
You may withdraw from your purchase within 14 days of the day you, or someone you name other than the carrier, receive the piece, without giving a reason. To do so, tell us clearly, for example by email to {email}, or use the [model withdrawal form](terms). It is enough to send your message before the 14 days end.

## Sending the piece back
Send the piece back within 14 days of telling us, insured, to {company_address}. The direct cost of returning it is yours, unless the piece is defective or not the one you ordered. If you can, return it in its packaging with its certificate; this is not a condition for the refund. You are only liable for any loss of value caused by handling the piece more than needed to establish its nature, characteristics and functioning.

## Refund
We refund everything you paid, including the standard delivery cost, within 14 days of the day you told us you withdraw, with the payment method you used and at no cost to you. We may wait until we have the piece back, or until you show you sent it, whichever comes first. If you chose a delivery more expensive than our standard one, the difference is not refunded.

## Exceptions
The right of withdrawal does not apply to goods made to the consumer's specifications or clearly personalised (article VI.53, 3° of the Code of Economic Law): bespoke pieces, engraving and resizing on request. These can only be returned for a defect.`,
    nl: `## Verzending
Juwelen in voorraad vertrekken binnen 2 werkdagen. Elk pakket is verzekerd voor de volle waarde en wordt tegen handtekening geleverd. Zodra het vertrekt, ontvangt u een e-mail met de track & trace-link, die u ook in uw account vindt.

## Uw herroepingsrecht
U kunt uw aankoop zonder opgave van redenen herroepen binnen 14 dagen na de dag waarop u, of iemand die u aanwijst en die niet de vervoerder is, het juweel ontvangt. Laat ons dat duidelijk weten, bijvoorbeeld per e-mail naar {email}, of gebruik het [modelformulier voor herroeping](terms). Het volstaat dat u uw bericht verstuurt voor de 14 dagen voorbij zijn.

## Het juweel terugsturen
Stuur het juweel verzekerd terug binnen 14 dagen nadat u ons op de hoogte bracht, naar {company_address}. De rechtstreekse kosten van de terugzending zijn voor u, behalve als het juweel een gebrek heeft of niet het bestelde is. Stuur het indien mogelijk terug in de verpakking en met het certificaat; dat is geen voorwaarde voor de terugbetaling. U bent enkel aansprakelijk voor waardevermindering die het gevolg is van een behandeling die verder gaat dan nodig om de aard, de kenmerken en de werking van het juweel vast te stellen.

## Terugbetaling
We betalen alles terug wat u betaalde, inclusief de standaard leveringskosten, binnen 14 dagen na de dag waarop u ons liet weten dat u herroept, via de betaalmethode die u gebruikte en zonder kosten voor u. We mogen wachten tot we het juweel terug hebben, of tot u aantoont dat u het verzonden hebt, naargelang wat eerst komt. Koos u een duurdere levering dan onze standaardlevering, dan betalen we het verschil niet terug.

## Uitzonderingen
Het herroepingsrecht geldt niet voor goederen die volgens de specificaties van de consument vervaardigd zijn of duidelijk voor een specifieke persoon bestemd zijn (artikel VI.53, 3° van het Wetboek van economisch recht): juwelen op maat, gravure en aanpassing van de maat op vraag. Die kunnen enkel bij een gebrek teruggestuurd worden.`,
    fr: `## Livraison
Les bijoux en stock partent sous 2 jours ouvrables. Chaque colis est assuré pour sa pleine valeur et remis contre signature. Dès son départ, vous recevez un e-mail avec le lien de suivi, que vous retrouvez aussi dans votre compte.

## Votre droit de rétractation
Vous pouvez vous rétracter de votre achat sans donner de motif dans les 14 jours suivant le jour où vous, ou une personne que vous désignez autre que le transporteur, recevez le bijou. Pour cela, informez-nous clairement, par exemple par e-mail à {email}, ou utilisez le [formulaire de rétractation](terms). Il suffit d'envoyer votre message avant la fin des 14 jours.

## Renvoyer le bijou
Renvoyez le bijou, assuré, dans les 14 jours suivant votre message, à {company_address}. Les frais directs du renvoi sont à votre charge, sauf si le bijou présente un défaut ou n'est pas celui commandé. Si possible, renvoyez-le dans son emballage avec son certificat ; ce n'est pas une condition du remboursement. Vous n'êtes responsable que de la dépréciation résultant de manipulations autres que celles nécessaires pour établir la nature, les caractéristiques et le bon fonctionnement du bijou.

## Remboursement
Nous remboursons tous les paiements reçus, y compris les frais de livraison standard, dans les 14 jours suivant le jour où vous nous avez informés de votre rétractation, par le moyen de paiement utilisé et sans frais pour vous. Nous pouvons attendre d'avoir récupéré le bijou, ou que vous ayez fourni une preuve de son expédition, la date la plus proche étant retenue. Si vous avez choisi une livraison plus coûteuse que notre livraison standard, la différence n'est pas remboursée.

## Exceptions
Le droit de rétractation ne s'applique pas aux biens confectionnés selon les spécifications du consommateur ou nettement personnalisés (article VI.53, 3° du Code de droit économique) : créations sur mesure, gravure et mise à taille sur demande. Ils ne peuvent être retournés qu'en cas de défaut.`,
  },
};

const privacy: LegalPage = {
  slug: 'privacy',
  title: { en: 'Privacy', nl: 'Privacy', fr: 'Confidentialité' },
  body: {
    en: `## Who is responsible
{company_name} (a trade name of {legal_name}, sole trader), {company_address}, VAT {vat_number}, {email}.

## What we keep, why, and for how long
- **Orders and invoices**: name, email, phone, delivery and billing address, the pieces and amounts. Needed to carry out your purchase (contract) and kept 7 years because accounting law requires it (legal obligation).
- **Your client account**: email, password (stored encrypted by our provider), addresses and wishlist. Needed for the account you asked for (contract). Kept until you close it, or 3 years after your last visit.
- **Appointment and contact requests**: name, email, phone, your message and, if you book online, the time you chose. To answer you and prepare your visit (our legitimate interest, or steps before a contract you asked for). Kept 2 years after the last contact.
- **Newsletter**: your email and the date and place you subscribed, only after you confirm it (your consent). Kept until you unsubscribe; every newsletter has a link for that.

## Who else sees it
Only the companies that help us serve you, bound by contract to protect your data: Stripe (payments), Supabase (database), Vercel (hosting), Resend (emails), Apple iCloud (our appointment calendar), our carrier (delivery), and DeepL for translating our own texts (no customer data). Stripe, Vercel and Apple are based in the United States; transfers there are covered by the EU-US Data Privacy Framework. We never sell your data.

## Your rights
You can ask to see, correct or delete your data, to receive it in a common format, to limit its use or to object to it, and you can withdraw your consent at any time, by writing to {email}. You can also file a complaint with the Belgian Data Protection Authority (www.dataprotectionauthority.be).`,
    nl: `## Wie is verantwoordelijk
{company_name} (handelsnaam van {legal_name}, eenmanszaak), {company_address}, btw {vat_number}, {email}.

## Wat we bewaren, waarom en hoe lang
- **Bestellingen en facturen**: naam, e-mail, telefoon, lever- en factuuradres, de juwelen en bedragen. Nodig om uw aankoop uit te voeren (overeenkomst) en 7 jaar bewaard omdat de boekhoudwetgeving dat vereist (wettelijke verplichting).
- **Uw klantenaccount**: e-mail, wachtwoord (versleuteld bewaard door onze leverancier), adressen en verlanglijst. Nodig voor het account dat u aanvroeg (overeenkomst). Bewaard tot u het afsluit, of 3 jaar na uw laatste bezoek.
- **Afspraak- en contactaanvragen**: naam, e-mail, telefoon, uw bericht en, als u online boekt, het gekozen moment. Om u te antwoorden en uw bezoek voor te bereiden (ons gerechtvaardigd belang, of stappen voor een overeenkomst op uw vraag). Bewaard tot 2 jaar na het laatste contact.
- **Nieuwsbrief**: uw e-mail en datum en plaats van inschrijving, pas nadat u ze bevestigt (uw toestemming). Bewaard tot u zich uitschrijft; elke nieuwsbrief heeft daarvoor een link.

## Wie het nog ziet
Enkel de bedrijven die ons helpen u te bedienen, contractueel verplicht uw gegevens te beschermen: Stripe (betalingen), Supabase (databank), Vercel (hosting), Resend (e-mails), Apple iCloud (onze afsprakenkalender), onze vervoerder (levering) en DeepL voor het vertalen van onze eigen teksten (geen klantgegevens). Stripe, Vercel en Apple zijn gevestigd in de Verenigde Staten; doorgifte daarheen valt onder het EU-VS-kader voor gegevensbescherming (Data Privacy Framework). We verkopen uw gegevens nooit.

## Uw rechten
U kunt uw gegevens inkijken, laten verbeteren of wissen, ze in een gangbaar formaat ontvangen, het gebruik ervan laten beperken of er bezwaar tegen maken, en u kunt uw toestemming altijd intrekken, door te schrijven naar {email}. U kunt ook klacht indienen bij de Gegevensbeschermingsautoriteit (www.gegevensbeschermingsautoriteit.be).`,
    fr: `## Responsable
{company_name} (nom commercial de {legal_name}, entreprise individuelle), {company_address}, TVA {vat_number}, {email}.

## Ce que nous conservons, pourquoi et combien de temps
- **Commandes et factures** : nom, e-mail, téléphone, adresses de livraison et de facturation, les bijoux et montants. Nécessaires pour exécuter votre achat (contrat) et conservés 7 ans car la loi comptable l'impose (obligation légale).
- **Votre compte client** : e-mail, mot de passe (conservé chiffré par notre prestataire), adresses et liste de souhaits. Nécessaires pour le compte que vous avez demandé (contrat). Conservés jusqu'à sa clôture, ou 3 ans après votre dernière visite.
- **Demandes de rendez-vous et de contact** : nom, e-mail, téléphone, votre message et, si vous réservez en ligne, le moment choisi. Pour vous répondre et préparer votre visite (notre intérêt légitime, ou mesures précontractuelles à votre demande). Conservés 2 ans après le dernier contact.
- **Newsletter** : votre e-mail ainsi que la date et le lieu de l'inscription, uniquement après votre confirmation (votre consentement). Conservés jusqu'à votre désinscription ; chaque envoi contient un lien pour cela.

## Qui d'autre y a accès
Uniquement les sociétés qui nous aident à vous servir, tenues par contrat de protéger vos données : Stripe (paiements), Supabase (base de données), Vercel (hébergement), Resend (e-mails), Apple iCloud (notre agenda de rendez-vous), notre transporteur (livraison) et DeepL pour traduire nos propres textes (aucune donnée client). Stripe, Vercel et Apple sont établis aux États-Unis ; ces transferts sont couverts par le cadre de protection des données UE-États-Unis (Data Privacy Framework). Nous ne vendons jamais vos données.

## Vos droits
Vous pouvez consulter, corriger ou supprimer vos données, les recevoir dans un format courant, en limiter l'usage ou vous y opposer, et retirer votre consentement à tout moment, en écrivant à {email}. Vous pouvez aussi introduire une plainte auprès de l'Autorité de protection des données (www.autoriteprotectiondonnees.be).`,
  },
};

const withdrawal: LegalPage = {
  slug: 'withdrawal',
  title: { en: 'Withdrawal form', nl: 'Formulier voor herroeping', fr: 'Formulaire de rétractation' },
  body: {
    en: `Complete and return this form only if you wish to withdraw from the contract. You can also simply write to us; see [Shipping and returns](returns).

To: {company_name} ({legal_name}), {company_address}, {email}

I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*):

Ordered on (*)/received on (*):

Name of consumer(s):

Address of consumer(s):

Signature of consumer(s) (only if this form is notified on paper):

Date:

(*) Delete as appropriate.`,
    nl: `Vul dit formulier alleen in en stuur het terug als u de overeenkomst wilt herroepen. U kunt ons ook gewoon schrijven; zie [Verzending en retour](returns).

Aan: {company_name} ({legal_name}), {company_address}, {email}

Ik/Wij (*) deel/delen (*) u hierbij mede dat ik/wij (*) onze overeenkomst betreffende de verkoop van de volgende goederen (*)/levering van de volgende dienst (*) herroep/herroepen (*):

Besteld op (*)/Ontvangen op (*):

Naam/Namen consument(en):

Adres consument(en):

Handtekening van consument(en) (alleen wanneer dit formulier op papier wordt ingediend):

Datum:

(*) Doorhalen wat niet van toepassing is.`,
    fr: `Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat. Vous pouvez aussi simplement nous écrire ; voir [Livraison et retours](returns).

À l'attention de : {company_name} ({legal_name}), {company_address}, {email}

Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :

Commandé le (*)/reçu le (*) :

Nom du (des) consommateur(s) :

Adresse du (des) consommateur(s) :

Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :

Date :

(*) Rayez la mention inutile.`,
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

/** The model form sits at the end of the terms, not on its own footer link. */
const ANNEX = { en: '## Annex: model withdrawal form', nl: '## Bijlage: modelformulier voor herroeping', fr: '## Annexe : formulaire de rétractation' };
const termsWithForm: LegalPage = {
  ...terms,
  body: {
    en: `${terms.body.en}\n\n${ANNEX.en}\n\n${withdrawal.body.en}`,
    nl: `${terms.body.nl}\n\n${ANNEX.nl}\n\n${withdrawal.body.nl}`,
    fr: `${terms.body.fr}\n\n${ANNEX.fr}\n\n${withdrawal.body.fr}`,
  },
};

// The withdrawal page stays (the order email attaches its text) but has no menu link.
export const LEGAL_PAGES: LegalPage[] = [termsWithForm, returns, privacy, cookies, withdrawal];
