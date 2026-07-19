import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claudeck — Chat AI Claude, bayar sesuai pakai",
  description:
    "SaaS chat berbasis Claude API resmi Anthropic. Top-up kredit, bayar hanya untuk token yang kamu pakai.",
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
