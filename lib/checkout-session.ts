/** What the bag hands to our checkout page, kept in the tab's sessionStorage. */
export const CHECKOUT_KEY = 'checkout';

export interface PendingCheckout {
  clientSecret: string;
  publishableKey: string;
  /** The delivery country the shipping was priced for. */
  country: string;
}
