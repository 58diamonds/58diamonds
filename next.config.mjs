/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fonts and logo for the invoice and withdrawal form PDFs (lib/invoice.ts).
  outputFileTracingIncludes: { '/**': ['./lib/pdf-assets/**'] },
};

export default nextConfig;
