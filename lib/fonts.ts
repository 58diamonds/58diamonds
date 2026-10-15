import { Cormorant_Garamond, Montserrat, Questrial } from 'next/font/google';

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

/** The 58 DIAMONDS wordmark lettering, for PRIVATE JEWELLER under the logo. */
export const questrial = Questrial({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-wordmark',
  display: 'swap',
});

export const fontVars = `${cormorant.variable} ${montserrat.variable} ${questrial.variable}`;
