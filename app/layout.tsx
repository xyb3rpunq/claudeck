import type { Metadata } from "next";
import "./globals.css";

const DESCRIPTION =
  "SaaS chat berbasis Claude API resmi Anthropic. Top-up kredit dalam Rupiah, bayar hanya untuk token yang kamu pakai.";

export const metadata: Metadata = {
  title: {
    default: "Claudeck — Chat AI Claude, bayar sesuai pakai",
    template: "%s — Claudeck",
  },
  description: DESCRIPTION,
  applicationName: "Claudeck",
  keywords: ["Claude", "AI", "chat", "Anthropic", "API", "kredit", "Rupiah"],
  openGraph: {
    title: "Claudeck — Chat AI Claude, bayar sesuai pakai",
    description: DESCRIPTION,
    type: "website",
    locale: "id_ID",
    siteName: "Claudeck",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claudeck — Chat AI Claude, bayar sesuai pakai",
    description: DESCRIPTION,
  },
  // Halaman publik boleh diindeks; /dashboard menimpanya dengan noindex.
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
