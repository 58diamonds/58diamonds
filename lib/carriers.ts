/** Carriers Farah can pick when shipping, with their public tracking pages. */
export const CARRIERS: { name: string; url: (n: string, postal?: string) => string }[] = [
  { name: 'bpost', url: (n) => `https://track.bpost.cloud/btr/web/#/search?itemCode=${encodeURIComponent(n)}&lang=en` },
  { name: 'PostNL', url: (n, postal) => `https://jouw.postnl.be/track-and-trace/${encodeURIComponent(n)}${postal ? `-BE-${encodeURIComponent(postal)}` : ''}` },
  { name: 'DHL', url: (n) => `https://www.dhl.com/be-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}` },
  { name: 'UPS', url: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  { name: 'FedEx', url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` },
  { name: 'DPD', url: (n) => `https://www.dpdgroup.com/be/mydpd/my-parcels/incoming?parcelNumber=${encodeURIComponent(n)}` },
  { name: 'GLS', url: (n) => `https://gls-group.com/BE/en/parcel-tracking?match=${encodeURIComponent(n)}` },
  { name: 'Malca-Amit', url: () => 'https://www.malca-amit.com/' },
];

export function trackingUrl(carrier: string, number: string, postal?: string): string | null {
  const c = CARRIERS.find((x) => x.name === carrier);
  return c && number.trim() ? c.url(number.trim(), postal) : null;
}
