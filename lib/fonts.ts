import { Cormorant_Garamond, Montserrat, Pinyon_Script } from 'next/font/google';

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

/** Small capitals: menu, buttons, labels. */
export const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const fontVars = `${cormorant.variable} ${montserrat.variable}`;

/** Handwriting, only for the "Coming soon..." line on the holding page. */
export const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
});
