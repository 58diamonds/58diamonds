import type { L10n } from './i18n';
import type {
  Attribute,
  EventItem,
  InstagramPost,
  MenuItem,
  Page,
  Piece,
  PressArticle,
  Section,
  Settings,
} from './types';
import { LEGAL_PAGES } from './legal';

/**
 * Starting content.
 *
 * Shown when no database is configured (a fresh checkout, a preview), and
 * written into the database by supabase/seed.sql, which is generated from this
 * file (npm run seed:sql). Product texts and prices are placeholders until
 * Farah sends her own; product photos by Ilan Taché (public/pieces), other photos from her Instagram.
 */

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SECTION = (n: number) => id('5ec00000', n);
const ATTR = (n: number) => id('a7700000', n);
const PIECE = (n: number) => id('91ece000', n);
const PAGE = (n: number) => id('9a9e0000', n);
const MENU = (n: number) => id('3e900000', n);
const EVENT = (n: number) => id('e7e90000', n);

const L = (en: string, nl: string, fr: string): L10n => ({ en, nl, fr });

export const DEMO_SETTINGS: Settings = {
  whatsapp_number: null,
  phone: null,
  email: null,
  address: null,
  instagram_handle: '58diamondsbyfarah',
  currency: 'EUR',
  shop_enabled: false,
  press_enabled: false,
  events_enabled: true,
  shipping_flat: 0,
  free_shipping_from: null,
  ship_to: ['BE', 'NL', 'LU', 'FR', 'DE'],
  gift_wrap_enabled: true,
  gift_wrap_price: 0,
  wishlist_enabled: true,
  newsletter_enabled: true,
  company_name: '58 Diamonds',
  company_address: 'Hoveniersstraat 50\n2018 Antwerp\nBelgium',
  vat_number: 'BE0711864093',
  vat_rate: 21,
  invoice_footer: null,
  hero_image_url: '/home/hero-hand.jpg',
  about_image_url: '/demo/02-farah-at-work-reel-cover.jpg',
  og_image_url: '/pieces/14-black.jpg',
  home_blocks: ['tiles', 'house', 'story', 'events', 'instagram', 'newsletter', 'contact'],
  home_tiles: [
    { image_url: '/home/tile-earrings.jpg', section_id: SECTION(3) },
    { image_url: '/home/tile-bracelets.jpg', section_id: SECTION(4) },
    { image_url: '/home/tile-pear-ring.jpg', section_id: SECTION(1) },
    { image_url: '/home/tile-rose-ring.jpg', section_id: SECTION(1) },
    { image_url: '/home/tile-necklace.jpg', section_id: SECTION(2) },
    { image_url: '/home/tile-hoops.jpg', section_id: SECTION(3) },
  ],
  header_logo: 'ink',
};

export const DEMO_SECTIONS: Section[] = [
  { id: SECTION(1), slug: 'rings', name: L('Rings', 'Ringen', 'Bagues'), description: L('Engagement rings, bands and statement rings.', 'Verlovingsringen, banden en opvallende ringen.', 'Bagues de fiançailles, alliances et bagues de caractère.'), cover_url: '/pieces/11-black.jpg', position: 0, visible: true, show_prices: true },
  { id: SECTION(2), slug: 'necklaces', name: L('Necklaces', 'Halskettingen', 'Colliers'), description: L('Tennis necklaces, pendants and charms.', 'Tennishalskettingen, hangers en bedels.', 'Colliers rivière, pendentifs et breloques.'), cover_url: '/pieces/22b-black.jpg', position: 1, visible: true, show_prices: true },
  { id: SECTION(3), slug: 'earrings', name: L('Earrings', 'Oorbellen', "Boucles d'oreilles"), description: L('Studs, climbers and drops.', 'Oorknopjes, climbers en hangers.', 'Puces, grimpantes et pendantes.'), cover_url: '/pieces/15-black.jpg', position: 2, visible: true, show_prices: true },
  { id: SECTION(4), slug: 'bracelets', name: L('Bracelets', 'Armbanden', 'Bracelets'), description: L('Tennis bracelets, bangles and stacks.', 'Tennisarmbanden, bangles en stacks.', 'Bracelets rivière, joncs et accumulations.'), cover_url: '/pieces/19-black.jpg', position: 3, visible: true, show_prices: true },
];

export const DEMO_ATTRIBUTES: Attribute[] = [
  { id: ATTR(1), kind: 'metal', slug: 'yellow-gold', label: L('Yellow gold', 'Geelgoud', 'Or jaune'), position: 0 },
  { id: ATTR(2), kind: 'metal', slug: 'white-gold', label: L('White gold', 'Witgoud', 'Or blanc'), position: 1 },
  { id: ATTR(3), kind: 'metal', slug: 'rose-gold', label: L('Rose gold', 'Roségoud', 'Or rose'), position: 2 },
  { id: ATTR(4), kind: 'metal', slug: 'platinum', label: L('Platinum', 'Platina', 'Platine'), position: 3 },
  { id: ATTR(11), kind: 'stone', slug: 'diamond', label: L('Diamond', 'Diamant', 'Diamant'), position: 0 },
  { id: ATTR(12), kind: 'stone', slug: 'sapphire', label: L('Sapphire', 'Saffier', 'Saphir'), position: 1 },
  { id: ATTR(13), kind: 'stone', slug: 'emerald', label: L('Emerald', 'Smaragd', 'Émeraude'), position: 2 },
];

const RING_SIZES = ['48', '50', '52', '54', '56', '58'];

/** Product photos by Ilan Taché, each on white (shop) and on black (dark blocks). */
const photo = (n: string, bg: 'white' | 'black') => `/pieces/${n}-${bg}.jpg`;

function piece(
  n: number,
  section: number,
  slug: string,
  photos: string[],
  title: L10n,
  description: L10n,
  extra: Partial<Piece> & { sizes?: number[] } = {},
): Piece {
  const pid = PIECE(n);
  const { sizes, ...rest } = extra;
  const urls = [...photos.map((p) => photo(p, 'white')), photo(photos[0], 'black')];
  return {
    id: pid,
    section_id: SECTION(section),
    slug,
    title,
    description,
    details: {},
    price: null,
    show_price: true,
    for_sale: true,
    stock: 1,
    metal_id: ATTR(2),
    stone_id: ATTR(11),
    visible: true,
    featured: false,
    position: 0,
    seo_title: {},
    seo_description: {},
    published_at: '2026-01-01T09:00:00Z',
    piece_images: urls.map((url, i) => ({ id: `${pid.slice(0, -4)}${String(i + 1).padStart(4, '0')}`, piece_id: pid, url, alt: title, position: i })),
    piece_variants: sizes
      ? RING_SIZES.map((label, i) => ({ id: `${pid.slice(0, -4)}${String(100 + i).padStart(4, '0')}`, piece_id: pid, label, stock: sizes[i] ?? 0, position: i }))
      : [],
    ...rest,
  };
}

const onRequest = { show_price: false } as const;

export const DEMO_PIECES: Piece[] = [
  // Rings
  piece(2, 1, 'leaf-and-flower-ring', ['02'],
    L('Leaf and flower ring', 'Blad- en bloemring', 'Bague feuille et fleur'),
    L('A branch of marquise leaves that wraps the finger and ends in a diamond flower.', 'Een tak van marquise blaadjes die rond de vinger draait en eindigt in een diamanten bloem.', 'Une branche de feuilles marquise qui entoure le doigt et se termine par une fleur de diamants.'),
    { price: 4200, metal_id: ATTR(3), featured: false, position: 0, stock: 0, sizes: [0, 1, 1, 1, 0, 0], published_at: '2026-09-20T10:00:00Z' }),
  piece(3, 1, 'triangle-ring', ['03'],
    L('Triangle ring', 'Driehoekring', 'Bague triangles'),
    L('Pavé diamond triangles stacked in rose gold, from knuckle to knuckle.', 'Driehoeken in pavé diamant, gestapeld in roségoud.', 'Des triangles pavés de diamants, superposés en or rose.'),
    { price: 5600, metal_id: ATTR(3), featured: true, position: 1, stock: 0, sizes: [0, 1, 2, 1, 1, 0], published_at: '2026-09-02T10:00:00Z' }),
  piece(4, 1, 'marquise-cluster-ring', ['04'],
    L('Marquise cluster ring', 'Marquise clusterring', 'Bague bouquet marquise'),
    L('A burst of marquise diamonds on an open double band.', 'Een bundel marquise diamanten op een open dubbele band.', 'Un éclat de diamants marquise sur un double anneau ouvert.'),
    { price: 7400, position: 2, stock: 0, sizes: [0, 1, 1, 0, 1, 0], published_at: '2026-08-14T10:00:00Z' }),
  piece(5, 1, 'yellow-diamond-cocktail-ring', ['05'],
    L('Yellow diamond cocktail ring', 'Cocktailring met gele diamanten', 'Bague cocktail diamants jaunes'),
    L('Fancy yellow pear and marquise diamonds scattered over a white diamond lace.', 'Fancy gele peer- en marquise diamanten verspreid over een kant van witte diamanten.', 'Des diamants jaunes poire et marquise semés sur une dentelle de diamants blancs.'),
    { ...onRequest, position: 3, published_at: '2026-07-30T10:00:00Z' }),
  piece(6, 1, 'rose-ring', ['06'],
    L('Rose ring', 'Roosring', 'Bague rose'),
    L('A full-bloom rose, every petal set with pavé diamonds.', 'Een roos in volle bloei, elk blaadje gezet met pavé diamanten.', 'Une rose épanouie, chaque pétale serti de diamants pavés.'),
    { ...onRequest, position: 4, published_at: '2026-07-11T10:00:00Z' }),
  piece(7, 1, 'feather-ring', ['07'],
    L('Feather ring', 'Veerring', 'Bague plume'),
    L('A pavé diamond feather across two fingers.', 'Een veer in pavé diamanten over twee vingers.', 'Une plume pavée de diamants sur deux doigts.'),
    { price: 6900, featured: true, position: 5, stock: 0, sizes: [0, 1, 1, 1, 0, 0], published_at: '2026-06-18T10:00:00Z' }),
  piece(8, 1, 'baguette-eternity-band', ['08'],
    L('Baguette eternity band', 'Baguette eternity ring', 'Alliance éternité baguettes'),
    L('A full circle of baguette diamonds between two rows of brilliants.', 'Een volle cirkel baguette diamanten tussen twee rijen briljanten.', 'Un tour complet de diamants baguette entre deux rangs de brillants.'),
    { price: 8500, position: 6, stock: 0, sizes: [0, 1, 1, 1, 1, 0], published_at: '2026-06-01T10:00:00Z' }),
  piece(9, 1, 'round-solitaire-ring', ['09'],
    L('Round solitaire ring', 'Ronde solitair', 'Solitaire rond'),
    L('A round brilliant held in a wide band of white and rose gold pavé.', 'Een ronde briljant in een brede band van wit- en roségoud pavé.', 'Un brillant rond tenu par un large anneau pavé or blanc et or rose.'),
    { ...onRequest, position: 7, published_at: '2026-05-12T10:00:00Z' }),
  piece(10, 1, 'yellow-pear-halo-ring', ['10'],
    L('Yellow pear halo ring', 'Gele peer halo ring', 'Bague poire jaune halo'),
    L('A fancy yellow pear diamond in a double halo of yellow and white diamonds.', 'Een fancy gele peervormige diamant in een dubbele halo van gele en witte diamanten.', 'Un diamant poire jaune dans un double halo de diamants jaunes et blancs.'),
    { ...onRequest, position: 8, published_at: '2026-04-20T10:00:00Z' }),
  piece(11, 1, 'heart-halo-ring', ['11'],
    L('Heart halo ring', 'Hart halo ring', 'Bague cœur halo'),
    L('A heart-shaped diamond in a double halo, on a split pavé band.', 'Een hartvormige diamant in een dubbele halo, op een gesplitste pavé band.', 'Un diamant cœur dans un double halo, sur un anneau pavé fendu.'),
    { price: 14800, position: 9, stock: 0, sizes: [0, 0, 1, 1, 0, 0], published_at: '2026-03-28T10:00:00Z' }),
  piece(12, 1, 'rose-gold-armour-ring', ['12'],
    L('Armour ring', 'Armour ring', 'Bague armure'),
    L('Open diamond waves in rose gold, from the base of the finger to the knuckle.', 'Open golven van diamant in roségoud, van de basis van de vinger tot de knokkel.', 'Des vagues de diamants ajourées en or rose, de la base du doigt à la phalange.'),
    { price: 6200, metal_id: ATTR(3), featured: true, position: 10, stock: 0, sizes: [0, 1, 1, 1, 0, 0], published_at: '2026-03-02T10:00:00Z' }),

  // Necklaces
  piece(22, 2, 'rainbow-tennis-necklace', ['22', '22b'],
    L('Rainbow tennis necklace', 'Regenboog tennisketting', 'Collier rivière arc-en-ciel'),
    L('Sapphires in every colour of the rainbow, all the way round.', 'Saffieren in alle kleuren van de regenboog, helemaal rond.', 'Des saphirs de toutes les couleurs de l’arc-en-ciel, tout autour du cou.'),
    { price: 12500, metal_id: ATTR(3), stone_id: ATTR(12), featured: true, position: 0, published_at: '2026-09-10T10:00:00Z' }),
  piece(21, 2, 'diamond-tennis-necklace', ['21'],
    L('Diamond tennis necklace', 'Diamanten tennisketting', 'Collier rivière diamants'),
    L('A single line of brilliant-cut diamonds in white gold.', 'Een enkele lijn briljant geslepen diamanten in witgoud.', 'Une ligne de diamants taille brillant en or blanc.'),
    { price: 15500, position: 1, published_at: '2026-07-22T10:00:00Z' }),
  piece(20, 2, 'riviera-spike-necklace', ['20'],
    L('Riviera spike necklace', 'Riviera spike ketting', 'Collier rivière pointes'),
    L('Pear diamonds pointing outwards on a fine rose gold line.', 'Peervormige diamanten die naar buiten wijzen op een fijne lijn in roségoud.', 'Des diamants poire pointés vers l’extérieur sur une fine ligne d’or rose.'),
    { price: 8800, metal_id: ATTR(3), position: 2, published_at: '2026-05-30T10:00:00Z' }),

  // Earrings
  piece(14, 3, 'wing-earrings', ['14'],
    L('Wing earrings', 'Vleugeloorbellen', "Boucles d'oreilles ailes"),
    L('Marquise and pear diamonds that climb the ear like wings.', 'Marquise- en peervormige diamanten die als vleugels langs het oor klimmen.', 'Des diamants marquise et poire qui montent le long de l’oreille comme des ailes.'),
    { price: 9800, featured: true, position: 0, published_at: '2026-09-25T10:00:00Z' }),
  piece(15, 3, 'doorknocker-earrings', ['15'],
    L('Doorknocker earrings', 'Doorknocker oorbellen', "Boucles d'oreilles heurtoir"),
    L('Rings of baguette and round diamonds that swing from an emerald-cut top.', 'Ringen van baguette en ronde diamanten die bewegen onder een top in smaragdslijpsel.', 'Des anneaux de diamants baguette et ronds qui se balancent sous un motif taille émeraude.'),
    { price: 12400, featured: true, position: 1, published_at: '2026-08-05T10:00:00Z' }),
  piece(13, 3, 'paisley-earrings', ['13'],
    L('Paisley earrings', 'Paisley oorbellen', "Boucles d'oreilles paisley"),
    L('An open paisley of diamonds, edged in rose gold.', 'Een open paisley van diamanten, afgewerkt in roségoud.', 'Un motif paisley ajouré de diamants, bordé d’or rose.'),
    { price: 7900, metal_id: ATTR(3), position: 2, published_at: '2026-06-27T10:00:00Z' }),
  piece(16, 3, 'inside-out-hoops', ['16'],
    L('Inside-out hoops', 'Inside-out creolen', 'Créoles intérieur-extérieur'),
    L('Oval hoops set with diamonds inside and out.', 'Ovale creolen, binnen en buiten gezet met diamanten.', 'Des créoles ovales serties de diamants à l’intérieur et à l’extérieur.'),
    { price: 6500, position: 3, stock: 2, published_at: '2026-04-09T10:00:00Z' }),

  // Bracelets
  piece(17, 4, 'tennis-bracelet', ['17'],
    L('Tennis bracelet', 'Tennisarmband', 'Bracelet rivière'),
    L('A line of brilliant-cut diamonds in white gold.', 'Een lijn briljant geslepen diamanten in witgoud.', 'Une ligne de diamants taille brillant en or blanc.'),
    { price: 4650, featured: true, position: 0, stock: 3, published_at: '2026-09-15T10:00:00Z' }),
  piece(18, 4, 'halo-tennis-bracelet', ['18'],
    L('Halo tennis bracelet', 'Halo tennisarmband', 'Bracelet rivière halo'),
    L('Each diamond framed by its own halo of brilliants.', 'Elke diamant omringd door een eigen halo van briljanten.', 'Chaque diamant entouré de son propre halo de brillants.'),
    { price: 7200, position: 1, published_at: '2026-07-04T10:00:00Z' }),
  piece(19, 4, 'baguette-link-bracelet', ['19'],
    L('Baguette link bracelet', 'Baguette schakelarmband', 'Bracelet maillons baguettes'),
    L('Links of baguette diamonds, each one framed in brilliants.', 'Schakels van baguette diamanten, elk omringd door briljanten.', 'Des maillons de diamants baguette, chacun encadré de brillants.'),
    { price: 11900, position: 2, published_at: '2026-05-21T10:00:00Z' }),
  piece(1, 4, 'fancy-colour-bracelet', ['01'],
    L('Fancy colour bracelet', 'Fancy colour armband', 'Bracelet diamants de couleur'),
    L('Two rows of fancy colour diamonds in every shape, from champagne to cognac.', 'Twee rijen fancy colour diamanten in alle vormen, van champagne tot cognac.', 'Deux rangs de diamants de couleur de toutes les tailles, du champagne au cognac.'),
    { ...onRequest, position: 3, published_at: '2026-03-15T10:00:00Z' }),
];

export const DEMO_PAGES: Page[] = [
  {
    id: PAGE(1),
    slug: 'about',
    title: L('About', 'Over ons', 'À propos'),
    body: L(
      "Made with love, to carry with joy.\n\nAt Fifty Eight Diamonds, we believe jewellery is so much more than something beautiful to wear. Every piece tells a story, holds a memory and carries a feeling.\n\nFrom my own jewellery collections to one-of-a-kind custom creations, everything I create is made with love, care and the hope of becoming something truly meaningful. Something to treasure today and perhaps pass down tomorrow.\n\nWhether it’s a delicate bracelet gifted by a grandmother to her granddaughter or an engagement ring marking the beginning of forever, it’s the love behind each piece that makes it truly special.\n\nI genuinely love what I do, and I’m incredibly grateful to everyone who allows me to be a small part of their most beautiful moments and personal stories.\n\nBecause the most precious jewellery isn’t just worn. It’s felt, remembered and cherished.\n\nWith love,\n\nFarah\nFounder, Fifty Eight Diamonds",
      "Met liefde gemaakt, om met vreugde te dragen.\n\nBij Fifty Eight Diamonds geloven we dat juwelen zoveel meer zijn dan iets moois om te dragen. Elk juweel vertelt een verhaal, bewaart een herinnering en draagt een gevoel.\n\nVan mijn eigen collecties tot unieke creaties op maat: alles wat ik maak, maak ik met liefde, zorg en de hoop dat het iets echt betekenisvols wordt. Iets om vandaag te koesteren en misschien morgen door te geven.\n\nOf het nu een fijne armband is die een grootmoeder aan haar kleindochter schenkt, of een verlovingsring die het begin van voor altijd markeert: het is de liefde achter elk juweel die het echt bijzonder maakt.\n\nIk hou oprecht van wat ik doe, en ik ben iedereen ontzettend dankbaar die mij een klein deel laat zijn van hun mooiste momenten en persoonlijke verhalen.\n\nWant de kostbaarste juwelen draag je niet alleen. Je voelt ze, je herinnert ze en je koestert ze.\n\nMet liefde,\n\nFarah\nOprichter, Fifty Eight Diamonds",
      "Fait avec amour, pour être porté avec joie.\n\nChez Fifty Eight Diamonds, nous croyons qu’un bijou est bien plus qu’une belle chose à porter. Chaque pièce raconte une histoire, garde un souvenir et porte une émotion.\n\nDe mes propres collections aux créations uniques sur mesure, tout ce que je crée est fait avec amour, avec soin et avec l’espoir de devenir quelque chose de vraiment précieux. Quelque chose à chérir aujourd’hui, et peut-être à transmettre demain.\n\nQu’il s’agisse d’un bracelet délicat offert par une grand-mère à sa petite-fille ou d’une bague de fiançailles qui marque le début de toujours, c’est l’amour derrière chaque pièce qui la rend vraiment unique.\n\nJ’aime sincèrement ce que je fais, et je suis profondément reconnaissante envers tous ceux qui me laissent faire partie de leurs plus beaux moments et de leurs histoires personnelles.\n\nCar les bijoux les plus précieux ne se portent pas seulement. On les ressent, on s’en souvient, on les chérit.\n\nAvec amour,\n\nFarah\nFondatrice, Fifty Eight Diamonds",
    ),
    image_url: '/demo/02-farah-at-work-reel-cover.jpg',
    seo_title: {},
    seo_description: L(
      'Farah, private jeweler and HRD-certified gemologist, designs diamond jewelry by appointment.',
      'Farah, private juwelier en HRD-gecertificeerd gemmoloog, ontwerpt diamanten juwelen op afspraak.',
      'Farah, joaillière privée et gemmologue certifiée HRD, crée des bijoux en diamants sur rendez-vous.',
    ),
    published: true,
  },
  ...LEGAL_PAGES.map((p, i) => ({ ...p, id: PAGE(10 + i), image_url: null, seo_title: {}, seo_description: {}, published: true })),
];

const pageId = (slug: string) => DEMO_PAGES.find((p) => p.slug === slug)!.id;

const menu = (
  n: number,
  where: MenuItem['menu'],
  position: number,
  item: Pick<MenuItem, 'kind'> & Partial<MenuItem>,
): MenuItem => ({ id: MENU(n), menu: where, position, visible: true, target: null, page_id: null, section_id: null, url: null, label: {}, ...item });

export const DEMO_MENU: MenuItem[] = [
  menu(1, 'header', 0, { kind: 'builtin', target: 'shop', label: L('Collection', 'Collectie', 'Collection') }),
  menu(2, 'header', 1, { kind: 'page', page_id: pageId('about'), label: L('About', 'Over ons', 'À propos') }),
  menu(3, 'header', 2, { kind: 'builtin', target: 'events', label: L('Events', 'Evenementen', 'Événements') }),
  menu(4, 'header', 3, { kind: 'builtin', target: 'press', label: L('Press', 'Pers', 'Presse') }),
  menu(5, 'header', 4, { kind: 'builtin', target: 'contact', label: L('Contact', 'Contact', 'Contact') }),
  menu(11, 'footer', 0, { kind: 'page', page_id: pageId('about'), label: L('About', 'Over ons', 'À propos') }),
  menu(12, 'footer', 1, { kind: 'builtin', target: 'contact', label: L('Contact', 'Contact', 'Contact') }),
  menu(13, 'footer', 2, { kind: 'page', page_id: pageId('terms'), label: L('Terms of sale', 'Verkoopsvoorwaarden', 'Conditions de vente') }),
  menu(14, 'footer', 3, { kind: 'page', page_id: pageId('returns'), label: L('Shipping and returns', 'Verzending en retour', 'Livraison et retours') }),
  menu(15, 'footer', 4, { kind: 'page', page_id: pageId('privacy'), label: L('Privacy', 'Privacy', 'Confidentialité') }),
  menu(16, 'footer', 5, { kind: 'page', page_id: pageId('cookies'), label: L('Cookies', 'Cookies', 'Cookies') }),
];

export const DEMO_EVENTS: EventItem[] = [
  {
    id: EVENT(1),
    slug: 'private-viewing-tennis',
    title: L('Private viewing: the tennis collection', 'Privévoorstelling: de tenniscollectie', 'Présentation privée : la collection rivière'),
    starts_at: '2026-11-20T17:00:00Z',
    ends_at: '2026-11-20T20:00:00Z',
    location: 'The showroom, by invitation',
    summary: L(
      'An evening with the new tennis bracelets and necklaces. Example event.',
      'Een avond met de nieuwe tennisarmbanden en -halskettingen. Voorbeeldevenement.',
      'Une soirée avec les nouveaux bracelets et colliers rivière. Événement exemple.',
    ),
    body: {},
    image_url: '/pieces/17-black.jpg',
    link_url: null,
    published: true,
  },
];

export const DEMO_PRESS: PressArticle[] = [];

const IG = [
  '12-marquise-wing-earrings', '09-crossover-ring-reel-cover', '01-evil-eye-sapphire-bracelets', '05-the-stack',
  '07-engagement-alps', '08-feather-ring-hermes', '02-farah-at-work-reel-cover', '03-tennis-bracelet-reel-cover',
];
export const DEMO_INSTAGRAM: InstagramPost[] = IG.map((file, i) => ({
  id: `ig${i}`,
  instagram_id: `ig${i}`,
  image_url: `/demo/${file}.jpg`,
  caption: '',
  permalink: 'https://www.instagram.com/58diamondsbyfarah/',
  media_type: 'IMAGE',
  taken_at: null,
  visible: true,
}));
